import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: base must match your GitHub repo name for GitHub Pages to work,
// e.g. if your repo is github.com/dhall1505/lotties-world, base stays '/lotties-world/'.
// If you rename the repo, update this to match.
export default defineConfig({
  plugins: [react()],
  base: '/lotties-world/',
})
