
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

## Camera Tracking System

This app uses a custom `CameraTracker` class to display real-time camera orientation telemetry in the Ursina window. Here’s how it works:

### How the Ursina Camera Works

- Ursina uses a global `camera` object to represent the player's viewpoint in the 3D world.
- The `EditorCamera` is a special camera controller that allows you to orbit, pan, and zoom around the scene using the mouse and keyboard. It updates the global camera's position and orientation every frame.
- You can have multiple camera controllers, but only one active camera at a time determines the rendered view.

### How CameraTracker Determines the Facing Side

- The `CameraTracker` class receives a reference to the camera (e.g., `EditorCamera`) when instantiated.
- Every frame, in its `update()` method, it reads the camera's forward vector (the direction the camera is looking).
- It compares this forward vector to the six face normals of the cube (using a dot product) to determine which face the camera is most directly looking at.
- The tracker then updates an on-screen text element to display the name and vector of the currently faced side, and colors the text to match that face.

#### Example (simplified):

```python
cam_forward = Vec3(self.cam.forward.x, self.cam.forward.y, self.cam.forward.z)
for face_vector in FACE_MAPPINGS.keys():
    similarity = cam_forward.dot(-face_vector)
    # Track the face with the highest similarity (most "in front" of the camera)
```

### Why the Tracker Class Must Be Global

- The `CameraTracker` class must be defined at the global/module level so Ursina can manage it as an entity and call its `update()` method every frame.
- If you define the class inside a function (like `main()`), Ursina’s entity system cannot find or manage it properly, and its `update()` method will not be called.

### Passing the Camera

- In `main()`, an `EditorCamera` instance is created and passed to the `CameraTracker` when it is instantiated:

  ```python
  editor_camera = EditorCamera()
  CameraTracker(camera_to_track=editor_camera)
  ```
- This allows the tracker to access the camera’s orientation and update the on-screen telemetry every frame.

### Multiple Trackers

- You can create multiple tracker entities to monitor different cameras or different aspects of the same camera. Each tracker will receive its own `update()` call every frame.

**Summary:**

- Always define your `Entity` subclasses (like `CameraTracker`) at the global/module level for Ursina to manage them correctly.
- Instantiate and pass in the camera (or other objects to track) from anywhere, such as `main()`.
- Ursina will handle calling `update()` on each tracker entity every frame.

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
