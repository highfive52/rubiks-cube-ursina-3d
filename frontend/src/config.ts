export const CUBE_CONFIG = {
  GRID_SIZE: 3,
  CUBIE_SIZE: 0.95,
  GAP: 0.05,
}

// Runtime debug flag: enable by appending `?debug=1` to the dev server URL.
export const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

export default CUBE_CONFIG
