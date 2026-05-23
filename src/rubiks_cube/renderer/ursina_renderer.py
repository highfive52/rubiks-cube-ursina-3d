from ursina import after, curve, invoke, scene


def make_ursina_renderer(cube_entities, rotation_helper, collider, check_for_win):
    """Return an `animate_from_model_change` function bound to renderer resources."""

    def reset_rotation_helper():
        [setattr(e, "world_parent", scene) for e in cube_entities]
        rotation_helper.rotation = (0, 0, 0)

    def animate_from_model_change(
        before_snapshot,
        after_snapshot,
        meta,
        move=None,
        affected=None,
        speed=1,
        on_complete=None,
    ):
        # Determine axis and direction from the provided `move` if available
        axis = getattr(move, "axis", None) if move is not None else None
        direction = getattr(move, "direction", 1) if move is not None else 1

        visual_degrees = 90 * direction

        # Determine sign for layer selection
        layer = getattr(move, "layer", None) if move is not None else None

        # Correct rotation glitch for opposing perspective anchors
        if (
            (axis == "x" and layer is not None and layer < 0)
            or (axis == "y" and layer is not None and layer < 0)
            or (axis == "z" and layer is not None and layer > 0)
        ):
            visual_degrees = -visual_degrees

        # Choose entities to parent based on axis and layer sign
        if axis == "x":
            if layer is None:
                selection = [e for e in cube_entities if abs(e.x) < 0.5]
            elif layer > 0:
                selection = [e for e in cube_entities if e.x > 0]
            else:
                selection = [e for e in cube_entities if e.x < 0]
            rot_prop = "rotation_x"
        elif axis == "y":
            if layer is None:
                selection = [e for e in cube_entities if abs(e.y) < 0.5]
            elif layer > 0:
                selection = [e for e in cube_entities if e.y > 0]
            else:
                selection = [e for e in cube_entities if e.y < 0]
            rot_prop = "rotation_y"
        elif axis == "z":
            if layer is None:
                selection = [e for e in cube_entities if abs(e.z) < 0.5]
            elif layer > 0:
                selection = [e for e in cube_entities if e.z > 0]
            else:
                selection = [e for e in cube_entities if e.z < 0]
            rot_prop = "rotation_z"
        else:
            selection = []
            rot_prop = "rotation_y"

        [setattr(e, "world_parent", rotation_helper) for e in selection]

        rotation_helper.animate(
            rot_prop,
            visual_degrees,
            duration=0.15 * speed,
            curve=curve.linear,
            interrupt="finish",
        )

        invoke(reset_rotation_helper, delay=0.2 * speed)

        if speed:
            collider.ignore_input = True

            @after(0.25 * speed)
            def _finish():
                collider.ignore_input = False
                check_for_win()
                if on_complete:
                    try:
                        on_complete()
                    except Exception:
                        pass

        else:
            # Immediate completion for speed=0 randomizations
            check_for_win()
            if on_complete:
                try:
                    on_complete()
                except Exception:
                    pass

    return animate_from_model_change
