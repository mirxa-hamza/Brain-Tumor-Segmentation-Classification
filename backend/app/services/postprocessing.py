"""Turn raw model logits into a BraTS-convention label map and human-readable stats."""

import numpy as np

from app.core.config import CLASS_INFO


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-x))


def probs_to_labelmap(probs: np.ndarray, threshold: float = 0.5) -> np.ndarray:
    """
    `probs` has shape (3, D, H, W) with channel order [NCR, ED, ET] (see CLASS_INFO's `channel`
    field). Each voxel is assigned to whichever class has the highest probability above
    `threshold`, or background (0) if none clear the threshold. Returns a uint8 label map using
    the BraTS convention: 0=background, 1=NCR/NET, 2=ED, 4=ET.
    """
    label_values = np.zeros(3, dtype=np.uint8)
    for info in CLASS_INFO.values():
        label_values[info["channel"]] = info["label_value"]

    best_channel = np.argmax(probs, axis=0)
    best_prob = np.max(probs, axis=0)

    label_map = np.zeros(probs.shape[1:], dtype=np.uint8)
    passing = best_prob >= threshold
    label_map[passing] = label_values[best_channel[passing]]
    return label_map


def compute_class_stats(label_map: np.ndarray, voxel_volume_mm3: float) -> list[dict]:
    stats = []
    for key, info in CLASS_INFO.items():
        voxel_count = int(np.count_nonzero(label_map == info["label_value"]))
        volume_cm3 = voxel_count * voxel_volume_mm3 / 1000.0
        stats.append(
            {
                "key": key,
                "label": info["name"],
                "voxel_count": voxel_count,
                "volume_cm3": round(volume_cm3, 3),
                "color": info["color"],
            }
        )
    return stats
