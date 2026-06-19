import { defineAppSetup } from '@slidev/types'
import * as sharedComponents from 'shared/components'

export default defineAppSetup(({ app }) => {
  for (const [name, component] of Object.entries(sharedComponents)) {
    app.component(name, component)
  }
})
