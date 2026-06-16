import { defineAppSetup } from '@slidev/types'
import * as shared from '@slides/shared/components'

export default defineAppSetup(({ app }) => {
  for (const [name, component] of Object.entries(shared)) {
    app.component(name, component)
  }
})
