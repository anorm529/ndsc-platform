'use client'

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {apiVersion, dataset, projectId} from './sanity/env'
import {schema} from './sanity/schemaTypes'
import {structure} from './sanity/structure'

const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({structure}),
    // Vision (GROQ explorer) only active in development
    ...(isDev ? [visionTool({defaultApiVersion: apiVersion})] : []),
  ],
})
