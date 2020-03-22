import {
  h,
  inject,
  provide,
  defineComponent,
  PropType,
  computed,
  ref,
  ComponentPublicInstance,
  unref,
  SetupContext,
  toRefs,
  KeepAlive,
} from 'vue'
import {
  RouteLocationMatched,
  VueUseOptions,
  RouteLocationNormalizedResolved,
} from '../types'
import {
  matchedRouteKey,
  viewDepthKey,
  routeLocationKey,
} from '../utils/injectionSymbols'

interface ViewProps {
  route: RouteLocationNormalizedResolved
  name: string
  keepAlive?: boolean
}

type UseViewOptions = VueUseOptions<ViewProps>

export function useView(options: UseViewOptions) {
  const depth: number = inject(viewDepthKey, 0)
  provide(viewDepthKey, depth + 1)

  const matchedRoute = computed(
    () =>
      unref(options.route).matched[depth] as RouteLocationMatched | undefined
  )
  const ViewComponent = computed(
    () =>
      matchedRoute.value && matchedRoute.value.components[unref(options.name)]
  )

  const propsData = computed(() => {
    // propsData only gets called if ViewComponent.value exists and it depends on matchedRoute.value
    const { props } = matchedRoute.value!
    if (!props) return {}
    const route = unref(options.route)
    if (props === true) return route.params

    return typeof props === 'object' ? props : props(route)
  })

  provide(matchedRouteKey, matchedRoute)

  const viewRef = ref<ComponentPublicInstance>()

  function onVnodeMounted() {
    // if we mount, there is a matched record
    matchedRoute.value!.instances[unref(options.name)] = viewRef.value
    // TODO: trigger beforeRouteEnter hooks
  }

  return (attrs: SetupContext['attrs']) => {
    const Component = ViewComponent.value
    if (!Component) return null
    const ComponentVnode = h(Component, {
      ...propsData.value,
      ...attrs,
      onVnodeMounted,
      ref: viewRef,
    })

    return options.keepAlive ? h(KeepAlive, {}, ComponentVnode) : ComponentVnode
  }
}

export const View = defineComponent({
  name: 'RouterView',
  props: {
    name: {
      type: String as PropType<string>,
      default: 'default',
    },
    keepAlive: Boolean,
  },

  setup(props, { attrs }) {
    const route = inject(routeLocationKey)!
    const renderView = useView({ route, ...toRefs(props) })

    return () => renderView(attrs)
  },
})
