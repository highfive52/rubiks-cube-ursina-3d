import { defineConfig } from 'vite'

export default defineConfig({
  // This forces Vite to use relative paths for assets, 
  // ensuring they load correctly on GitHub Pages' subfolder structure
  base: '/rubiks-cube-ursina-3d/',
})