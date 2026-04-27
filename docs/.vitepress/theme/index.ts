/**
 * Extend VitePress default theme.
 *
 * The only customization: force full-page navigation for static public/ apps
 * (demo, playground) so VitePress's SPA router doesn't 404 them.
 */
import DefaultTheme from 'vitepress/theme'
import { useRouter } from 'vitepress'
import { watch, defineComponent, h } from 'vue'

const STATIC_APPS = ['/prefab/demo/', '/prefab/playground/']

/** Invisible component that watches route changes and redirects static apps. */
const StaticAppRedirect = defineComponent({
  setup() {
    const router = useRouter()
    watch(
      () => router.route.path,
      (path) => {
        if (STATIC_APPS.some((app) => path.startsWith(app) || path + '/' === app)) {
          // Full navigation — bypass the SPA router
          window.location.href = path.endsWith('/') ? path + 'index.html' : path
        }
      },
    )
    return () => null
  },
})

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(StaticAppRedirect),
    })
  },
}
