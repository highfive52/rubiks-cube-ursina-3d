from typing import Tuple

# Face mappings should be provided by the app (e.g. main.py) as mapping of normals to metadata.


def _to_tuple(vec) -> Tuple[int, int, int]:
    try:
        return int(vec.x), int(vec.y), int(vec.z)
    except Exception:
        return tuple(map(int, vec))  # type: ignore[arg-type]


def select_face(cam_forward, face_mappings) -> Tuple[int, int, int]:
    """Return the face normal (tuple) from face_mappings that best matches cam_forward.

    `cam_forward` may be a Vec3-like object or a 3-tuple/list.
    `face_mappings` is an iterable of normal vectors (keys) or mapping with normals as keys.
    """
    fx, fy, fz = (
        float(getattr(cam_forward, "x", cam_forward[0])),
        float(getattr(cam_forward, "y", cam_forward[1])),
        float(getattr(cam_forward, "z", cam_forward[2])),
    )

    best = None
    best_sim = -float("inf")
    # face_mappings may be dict or iterable
    normals = (
        list(face_mappings.keys())
        if hasattr(face_mappings, "keys")
        else list(face_mappings)
    )

    for n in normals:
        nx, ny, nz = _to_tuple(n)
        sim = fx * (-nx) + fy * (-ny) + fz * (-nz)
        if sim > best_sim:
            best_sim = sim
            best = (nx, ny, nz)

    if best is None:
        raise ValueError("No face mapping provided")

    return best


def screen_axes(
    cam_right, cam_up, face_mappings
) -> Tuple[Tuple[int, int, int], Tuple[int, int, int]]:
    """Compute screen_right and screen_up axes in model-face coordinates.

    Returns a tuple: (screen_right, screen_up)
    Each axis is a tuple normal like (1,0,0) or (-1,0,0).
    """
    # Normalize inputs to components
    rx, ry, rz = (
        float(getattr(cam_right, "x", cam_right[0])),
        float(getattr(cam_right, "y", cam_right[1])),
        float(getattr(cam_right, "z", cam_right[2])),
    )
    ux, uy, uz = (
        float(getattr(cam_up, "x", cam_up[0])),
        float(getattr(cam_up, "y", cam_up[1])),
        float(getattr(cam_up, "z", cam_up[2])),
    )

    normals = (
        list(face_mappings.keys())
        if hasattr(face_mappings, "keys")
        else list(face_mappings)
    )

    def best_axis(vec):
        best = None
        best_dot = -float("inf")
        vx, vy, vz = vec
        for n in normals:
            nx, ny, nz = _to_tuple(n)
            dot = abs(vx * nx + vy * ny + vz * nz)
            if dot > best_dot:
                best_dot = dot
                best = (
                    nx * (1 if (vx * nx + vy * ny + vz * nz) > 0 else -1),
                    ny * (1 if (vx * nx + vy * ny + vz * nz) > 0 else -1),
                    nz * (1 if (vx * nx + vy * ny + vz * nz) > 0 else -1),
                )
        return best

    screen_right = best_axis((rx, ry, rz))
    screen_up = best_axis((ux, uy, uz))

    return screen_right, screen_up
