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

from ..model.cube_model import CubeModel

from ..cube_controller import CubeController
from ..engine.move_engine import MoveEngine

cube_model = CubeModel()
# Module-level runtime hooks populated in main()
input_handler = None
controller = None


def sync_model_from_entities(model, cube_entities):
    for e in cube_entities:
        model.cubes[(int(e.x), int(e.y), int(e.z))] = {
            "pos": (e.x, e.y, e.z),
            "rot": e.world_rotation,
        }


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
class CameraTracker(Entity):

    def __init__(self, camera_to_track, rotate_side_callback):
        super().__init__()
        self.prime_mode = False
        self.cam = camera_to_track
        self.rotate_side_callback = rotate_side_callback

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
        """Forward an intended move into the provided rotate_side_callback.

        This acts as an Ursina adapter: instead of interpreting or owning the
        move queue, the tracker forwards the raw intent (normal, direction)
        to the router (legacy `InputHandler.enqueue_action` or new
        `InputController.enqueue_action`).
        """

        # Normalize `normal` into a plain tuple of ints to keep the input
        # layer renderer-agnostic and serializable. Guard against None.
        def _to_tuple(n):
            if n is None:
                return None
            try:
                return int(n.x), int(n.y), int(n.z)
            except Exception:
                try:
                    return tuple(map(int, n))
                except Exception:
                    return None

        norm = _to_tuple(normal)
        if norm is None:
            # ignore malformed inputs
            return

        # rotate_side_callback is expected to be a callable accepting
        # (action_or_normal, direction=1, tracker=None)
        self.rotate_side_callback(norm, direction, tracker=self)

    def update(self):
        global input_handler, controller
        if input_handler is not None and controller is not None:
            actions = input_handler.poll()
            if actions:
                controller.process_actions(actions)

        # Move dispatching is handled by the input layer (legacy or new).
        # The tracker no longer owns a move queue; keep `is_animating` for
        # telemetry compatibility but do not consume moves here.

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

        cam_right_raw = self.cam.right
        cam_up_raw = self.cam.up

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

        is_prime = (
            "shift+" in key
            or key.isupper()
            or held_keys["shift"] > 0
            or getattr(self, "prime_mode", False)
        )

        direction = -1 if is_prime else 1

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

    collider = Entity(model="cube", scale=3, collider="box", visible=False)

    def collider_input(key):
        if mouse.hovered_entity == collider:
            if key == "left mouse down":
                input_handler.enqueue_action(mouse.normal, 1, tracker=None)
            elif key == "right mouse down":
                input_handler.enqueue_action(mouse.normal, -1, tracker=None)

    collider.input = collider_input

    rotation_helper = Entity()

    win_text_entity = Text(y=0.35, text="", color=color.green, origin=(0, 0), scale=3)

    def check_for_win():

        if cube_model.is_solved():
            win_text_entity.text = "SOLVED!"
            win_text_entity.appear()
        else:
            win_text_entity.text = ""

    from ..renderer.ursina_renderer import make_ursina_renderer

    animate_fn = make_ursina_renderer(
        cube_entities, rotation_helper, collider, check_for_win
    )

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
            input_handler.enqueue_action(
                random.choice(faces), random.choice((-1, 1)), tracker=None
            )

    randomize_button = Button(
        text="randomize", color=color.azure, position=(0.7, -0.4), on_click=randomize
    )
    randomize_button.fit_to_text()

    window.color = color._16

    editor_camera = EditorCamera()
    editor_camera.ignore_input = True
    editor_camera.input = lambda key: None

    # Use the new platform-agnostic InputController (legacy removed)
    from ..input import InputController

    input_handler = InputController()

    move_engine = MoveEngine(cube_model)
    controller = CubeController(
        engine=move_engine, model=cube_model, renderer_callback=animate_fn
    )

    tracker = CameraTracker(
        camera_to_track=editor_camera, rotate_side_callback=input_handler.enqueue_action
    )
    tracker.parent = scene
    tracker.enabled = True

    globals()["input_handler"] = input_handler
    globals()["controller"] = controller

    app.run()


if __name__ == "__main__":
    main()
