from collections import deque
from copy import copy
import random
from ursina import (
    Button,
    EditorCamera,
    Entity,
    Text,
    Ursina,
    Vec3,
    after,
    color,
    curve,
    invoke,
    mouse,
    scene,
    window,
    held_keys,
)

# =========================================================
# CONFIGURATION
# =========================================================
FACE_MAPPINGS = {
    Vec3(1, 0, 0): {"name": "Right (Pink)", "color": color.pink},
    Vec3(-1, 0, 0): {"name": "Left (Orange)", "color": color.orange},
    Vec3(0, 1, 0): {"name": "Top (White)", "color": color.white},
    Vec3(0, -1, 0): {"name": "Bottom (Yellow)", "color": color.yellow},
    Vec3(0, 0, 1): {"name": "Back (Azure)", "color": color.azure},
    Vec3(0, 0, -1): {"name": "Front (Green)", "color": color.green},
}


# =========================================================
# INPUT / CAMERA LOGIC
# =========================================================
# NOTE: This will become InputController in Phase 4
class CameraTracker(Entity):

    def __init__(self, camera_to_track, rotate_side_callback):
        super().__init__()
        self.prime_mode = False
        self.cam = camera_to_track
        self.rotate_side_callback = (
            rotate_side_callback  # Reference to rotate_side in main()
        )

        # Internal Queue Tracking State
        self.move_queue = deque()
        self.is_animating = False

        # Track the active face vector dynamically
        self.current_face = None

        # Build the text element directly inside this tracking object
        self.telemetry_text = Text(
            text="Aligning Telemetry...",
            position=(-0.85, 0.45),
            scale=1.5,
        )

    def add_move_to_queue(self, normal, direction=1):
        """Public method allowing mouse clicks or keys to push moves safely into the queue."""
        self.move_queue.append((normal, direction))

    def update(self):
        # --- 1. Process Animation Queue (FIFO) ---
        if not self.is_animating and self.move_queue:
            self.is_animating = True
            normal, direction = self.move_queue.popleft()
            # Pass 'self' so the rotation callback can clear our animation lock when finished
            self.rotate_side_callback(normal, direction, tracker=self)

        # --- 2. Track Face Perspective ---
        cam_forward = Vec3(self.cam.forward.x, self.cam.forward.y, self.cam.forward.z)

        best_match_vector = None
        highest_similarity = -1.0

        for face_vector in FACE_MAPPINGS.keys():
            similarity = cam_forward.dot(-face_vector)
            if similarity > highest_similarity:
                highest_similarity = similarity
                best_match_vector = face_vector

        if best_match_vector:
            self.current_face = best_match_vector
            face_info = FACE_MAPPINGS[best_match_vector]
            self.telemetry_text.text = (
                f"Facing: {face_info['name']}\nVector: {best_match_vector}"
            )
            self.telemetry_text.color = face_info["color"]

    def input(self, key):

        if key == "space":
            self.prime_mode = not self.prime_mode
            return

        base_key = key.lower()

        valid_keys = {"w", "a", "s", "d", "e", "1", "2", "3", "4"}
        if base_key not in valid_keys or self.current_face is None:
            return

        is_prime = held_keys["shift"] > 0

        # --- Extract the Camera's True Screen Vectors ---
        cam_right_raw = self.cam.right
        cam_up_raw = self.cam.up

        # --- Align to Nearest Global Face Vector Axis ---
        screen_right_axis = None
        screen_up_axis = None
        max_right_dot = -1.0
        max_up_dot = -1.0

        for face_vector in FACE_MAPPINGS.keys():
            right_dot = abs(cam_right_raw.dot(face_vector))
            up_dot = abs(cam_up_raw.dot(face_vector))

            if right_dot > max_right_dot:
                max_right_dot = right_dot
                screen_right_axis = face_vector * (
                    1 if cam_right_raw.dot(face_vector) > 0 else -1
                )

            if up_dot > max_up_dot:
                max_up_dot = up_dot
                screen_up_axis = face_vector * (
                    1 if cam_up_raw.dot(face_vector) > 0 else -1
                )

        # Added self.prime_mode check as an OR condition
        is_prime = (
            "shift+" in key
            or key.isupper()
            or held_keys["shift"] > 0
            or getattr(self, "prime_mode", False)
        )

        direction = -1 if is_prime else 1

        # --- Use match/case for debug toggles and moves ---
        # --- For moves, append parameters to queue instead of executing instantly ---
        match base_key:
            case "1":
                self.telemetry_text.enabled = not self.telemetry_text.enabled
                return
            case "2":
                window.fps_counter.enabled = not window.fps_counter.enabled
                return
            case "3":
                window.entity_counter.enabled = not window.entity_counter.enabled
                return
            case "4":
                window.collider_counter.enabled = not window.collider_counter.enabled
                return
            case "d":
                self.add_move_to_queue(screen_right_axis, direction)
                return
            case "a":
                self.add_move_to_queue(-screen_right_axis, direction)
                return
            case "w":
                self.add_move_to_queue(screen_up_axis, direction)
                return
            case "s":
                self.add_move_to_queue(-screen_up_axis, direction)
                return
            case "e":
                self.add_move_to_queue(self.current_face, direction)
                return


def main():

    app = Ursina()

    cube_colors = [
        color.pink,  # right
        color.orange,  # left
        color.white,  # top
        color.yellow,  # bottom
        color.azure,  # back
        color.green,  # front
    ]

    # make a model with a separate color on each face
    combine_parent = Entity(enabled=False)
    for i, direction in enumerate((Vec3.right, Vec3.up, Vec3.forward)):
        e = Entity(
            parent=combine_parent,
            model="plane",
            origin_y=-0.5,
            texture="white_cube",
            color=cube_colors[i * 2],
        )
        e.look_at(direction, Vec3.up)

        e_flipped = Entity(
            parent=combine_parent,
            model="plane",
            origin_y=-0.5,
            texture="white_cube",
            color=cube_colors[(i * 2) + 1],
        )
        e_flipped.look_at(-direction, Vec3.up)

    combine_parent.combine()

    # place 3x3x3 cubes
    cube_entities = []
    for x in range(3):
        for y in range(3):
            for z in range(3):
                e = Entity(
                    model=copy(combine_parent.model),
                    position=Vec3(x, y, z) - (Vec3(3, 3, 3) / 3),
                    texture="white_cube",
                )
                cube_entities.append(e)

    # rotate a side when we click on it
    collider = Entity(model="cube", scale=3, collider="box", visible=False)

    def collider_input(key):
        if mouse.hovered_entity == collider:
            if key == "left mouse down":
                rotate_side(mouse.normal, 1)
            elif key == "right mouse down":
                rotate_side(mouse.normal, -1)

    collider.input = collider_input

    rotation_helper = Entity()

    # =========================================================
    # CUBE MODEL + RENDERING (CURRENTLY COUPLED)
    # =========================================================
    def rotate_side(normal, direction=1, speed=1, tracker=None):

        # =====================================================
        # RENDERING LAYER (URSINA ENTITIES ONLY)
        # =====================================================

        # Future: this becomes CubeModel.apply_move()

        visual_degrees = 90 * direction

        # Correct rotation glitch for opposing perspective anchors
        if normal in (Vec3(-1, 0, 0), Vec3(0, -1, 0), Vec3(0, 0, 1)):
            visual_degrees = -visual_degrees

        match (normal.x, normal.y, normal.z):
            case (1, 0, 0):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.x > 0
                ]
                rotation_helper.animate(
                    "rotation_x",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )
            case (-1, 0, 0):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.x < 0
                ]
                rotation_helper.animate(
                    "rotation_x",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )
            case (0, 1, 0):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.y > 0
                ]
                rotation_helper.animate(
                    "rotation_y",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )
            case (0, -1, 0):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.y < 0
                ]
                rotation_helper.animate(
                    "rotation_y",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )
            case (0, 0, 1):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.z > 0
                ]
                rotation_helper.animate(
                    "rotation_z",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )
            case (0, 0, -1):
                [
                    setattr(e, "world_parent", rotation_helper)
                    for e in cube_entities
                    if e.z < 0
                ]
                rotation_helper.animate(
                    "rotation_z",
                    visual_degrees,
                    duration=0.15 * speed,
                    curve=curve.linear,
                    interrupt="finish",
                )

        invoke(reset_rotation_helper, delay=0.2 * speed)

        if speed and tracker:
            collider.ignore_input = True

            @after(0.25 * speed)
            def _():
                collider.ignore_input = False
                check_for_win()
                # UNLOCK QUEUE: Move finished cleanly, reset animation state on tracker
                tracker.is_animating = False

        else:
            # Immediate unlock for speed=0 instant randomizations
            if tracker:
                tracker.is_animating = False

    def reset_rotation_helper():
        [setattr(e, "world_parent", scene) for e in cube_entities]
        rotation_helper.rotation = (0, 0, 0)

    win_text_entity = Text(y=0.35, text="", color=color.green, origin=(0, 0), scale=3)

    # NOTE: This is currently based on rendering state.
    # Future: should be model-based (CubeModel.is_solved())
    def check_for_win():

        if {e.world_rotation for e in cube_entities} == {Vec3(0, 0, 0)}:
            win_text_entity.text = "SOLVED!"
            win_text_entity.appear()
        else:
            win_text_entity.text = ""

    def randomize():
        faces = (
            Vec3(1, 0, 0),
            Vec3(0, 1, 0),
            Vec3(0, 0, 1),
            Vec3(-1, 0, 0),
            Vec3(0, -1, 0),
            Vec3(0, 0, -1),
        )
        for _ in range(20):
            rotate_side(
                normal=random.choice(faces), direction=random.choice((-1, 1)), speed=0
            )

    randomize_button = Button(
        text="randomize", color=color.azure, position=(0.7, -0.4), on_click=randomize
    )
    randomize_button.fit_to_text()

    window.color = color._16

    # 1. Instantiate the camera
    editor_camera = EditorCamera()

    # 2. Tell EditorCamera to ignore keyboard inputs so it stops stealing WASD
    # (Mouse pan, orbit, and zoom will still work fine!)
    editor_camera.ignore_input = True

    # 3. Instantiate the tracker, passing the callback
    tracker = CameraTracker(
        camera_to_track=editor_camera, rotate_side_callback=rotate_side
    )

    app.run()


if __name__ == "__main__":
    main()
