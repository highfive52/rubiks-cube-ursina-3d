# Rubik's Cube Ursina App

## How to Run

1. Install dependencies (in your virtual environment):
  ```sh
  uv pip install -r requirements.txt
  # or, if using pyproject.toml:
  uv pip install .
  ```
2. Run the app:
  ```sh
  uv run rubiks-cube
  # or
  uv run src/rubiks_cube/main.py
  # or
  python src/rubiks_cube/main.py
  ```
## Spacial Mapping

|Face Name       |Notation    |Ursina Direction Vector   |Vector Notation  |
|----------------|------------|--------------------------|-----------------|
|Right           |r           |"Vec3(1, 0, 0)"           |Vec3.right       |
|Left            |l           |"Vec3(-1, 0, 0)"          |Vec3.left        |
|Top (Up)        |u           |"Vec3(0, 1, 0)"           |Vec3.up          |
|Bottom (Down)   |d           |"Vec3(0, -1, 0)"          |Vec3.down        |
|Back            |b           |"Vec3(0, 0, 1)"           |Vec3.forward     |
|Front           |f           |"Vec3(0, 0, -1)"          |Vec3.back        |

## Controls

- **Rotate a side:**
  - **Left-click** on a face of the cube to rotate that side clockwise.
  - **Right-click** on a face of the cube to rotate that side counterclockwise.
- **Randomize:**
  - Click the `randomize` button in the lower right to scramble the cube.
- **Camera:**
  - Use your mouse to orbit, pan, and zoom the view (EditorCamera controls).

## Notes
- The app window must be focused for mouse controls to work.
- You do not need Blender or .blend files unless you want to import custom 3D models.

## Code Quality: pre-commit Hooks

This project uses [pre-commit](https://pre-commit.com/) to automate code formatting and linting.

### Setup pre-commit
1. Install pre-commit (if not already):
   ```sh
   pip install pre-commit
   ```
2. Install the hooks:
   ```sh
   pre-commit install
   ```

### Usage
- Hooks will run automatically on `git commit`.
- To run all hooks manually on all files:
  ```sh
  pre-commit run --all-files
  ```

Enjoy solving the Rubik's Cube!
