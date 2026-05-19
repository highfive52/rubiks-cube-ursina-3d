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
)

# 1. Keep your configuration dictionary out here
FACE_MAPPINGS = {
    Vec3(1, 0, 0): {"name": "Right (Pink)", "color": color.pink},
    Vec3(-1, 0, 0): {"name": "Left (Orange)", "color": color.orange},
    Vec3(0, 1, 0): {"name": "Top (White)", "color": color.white},
    Vec3(0, -1, 0): {"name": "Bottom (Yellow)", "color": color.yellow},
    Vec3(0, 0, 1): {"name": "Back (Azure)", "color": color.azure},
    Vec3(0, 0, -1): {"name": "Front (Green)", "color": color.green},
}


class CameraTracker(Entity):

    def __init__(self, camera_to_track):
        # super().__init__() tells Ursina to register this object into the game world
        super().__init__()
        self.cam = camera_to_track

        # Build the text element directly inside this tracking object
        self.telemetry_text = Text(
            text="Aligning Telemetry...",
            position=(-0.85, 0.45),
            scale=1.5,
        )

    # Ursina automatically calls this method every single frame for every active Entity.
    # It completely bypasses the __main__ scope issue.
    def update(self):
        cam_forward = Vec3(self.cam.forward.x, self.cam.forward.y, self.cam.forward.z)

        best_match_vector = None
        highest_similarity = -1.0

        for face_vector in FACE_MAPPINGS.keys():
            similarity = cam_forward.dot(-face_vector)
            if similarity > highest_similarity:
                highest_similarity = similarity
                best_match_vector = face_vector

        if best_match_vector:
            face_info = FACE_MAPPINGS[best_match_vector]
            self.telemetry_text.text = (
                f"Facing: {face_info['name']}\nVector: {best_match_vector}"
            )
            self.telemetry_text.color = face_info["color"]


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
    cubes = []
    for x in range(3):
        for y in range(3):
            for z in range(3):
                e = Entity(
                    model=copy(combine_parent.model),
                    position=Vec3(x, y, z) - (Vec3(3, 3, 3) / 3),
                    texture="white_cube",
                )
                cubes.append(e)

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

    def rotate_side(normal, direction=1, speed=1):
        visual_degrees = 90 * direction

        # Correct rotation glitch for opposing perspective anchors
        if normal in (Vec3(-1, 0, 0), Vec3(0, -1, 0), Vec3(0, 0, 1)):
            visual_degrees = -visual_degrees

        if normal == Vec3(1, 0, 0):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.x > 0]
            rotation_helper.animate(
                "rotation_x",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )
        elif normal == Vec3(-1, 0, 0):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.x < 0]
            rotation_helper.animate(
                "rotation_x",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )
        elif normal == Vec3(0, 1, 0):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.y > 0]
            rotation_helper.animate(
                "rotation_y",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )
        elif normal == Vec3(0, -1, 0):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.y < 0]
            rotation_helper.animate(
                "rotation_y",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )
        elif normal == Vec3(0, 0, 1):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.z > 0]
            rotation_helper.animate(
                "rotation_z",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )
        elif normal == Vec3(0, 0, -1):
            [setattr(e, "world_parent", rotation_helper) for e in cubes if e.z < 0]
            rotation_helper.animate(
                "rotation_z",
                visual_degrees,
                duration=0.15 * speed,
                curve=curve.linear,
                interrupt="finish",
            )

        invoke(reset_rotation_helper, delay=0.2 * speed)

        if speed:
            collider.ignore_input = True

            @after(0.25 * speed)
            def _():
                collider.ignore_input = False
                check_for_win()

    def reset_rotation_helper():
        [setattr(e, "world_parent", scene) for e in cubes]
        rotation_helper.rotation = (0, 0, 0)

    win_text_entity = Text(y=0.35, text="", color=color.green, origin=(0, 0), scale=3)

    def check_for_win():
        if {e.world_rotation for e in cubes} == {Vec3(0, 0, 0)}:
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

    # Instantiate the camera
    editor_camera = EditorCamera()

    # Instantiate our new tracking class!
    # We pass the camera into it, and Ursina handles the rest.
    CameraTracker(camera_to_track=editor_camera)

    app.run()


if __name__ == "__main__":
    main()
