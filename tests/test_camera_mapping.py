from rubiks_cube.input.camera_mapping import select_face, screen_axes


def test_select_face_prefers_opposite():
    face_mappings = {
        (1, 0, 0): {},
        (-1, 0, 0): {},
        (0, 1, 0): {},
        (0, -1, 0): {},
        (0, 0, 1): {},
        (0, 0, -1): {},
    }

    # cam_forward toward +x should select the face with normal (-1,0,0)
    chosen = select_face((1, 0, 0), face_mappings)
    assert chosen == (-1, 0, 0)


def test_screen_axes_alignments():
    face_mappings = {
        (1, 0, 0): {},
        (-1, 0, 0): {},
        (0, 1, 0): {},
        (0, -1, 0): {},
        (0, 0, 1): {},
        (0, 0, -1): {},
    }

    screen_right, screen_up = screen_axes((1, 0, 0), (0, 1, 0), face_mappings)
    assert screen_right == (1, 0, 0)
    assert screen_up == (0, 1, 0)
