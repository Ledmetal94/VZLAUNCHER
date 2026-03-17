"""
Image matching using OpenCV template matching.
Takes a reference screenshot and finds it on the current screen.
"""

import cv2
import numpy as np
import pyautogui


def find(image_path, confidence=0.8):
    """
    Find image_path on the current screen.

    Returns (x, y, actual_confidence) of the center of the match, or None if not found.
    """
    # Capture current screen
    screenshot = pyautogui.screenshot()
    screen = np.array(screenshot)
    screen_bgr = cv2.cvtColor(screen, cv2.COLOR_RGB2BGR)

    # Load template
    template = cv2.imread(image_path)
    if template is None:
        raise FileNotFoundError(f"Reference image not found: {image_path}")

    h, w = template.shape[:2]

    # Template matching
    result = cv2.matchTemplate(screen_bgr, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)

    if max_val >= confidence:
        center_x = max_loc[0] + w // 2
        center_y = max_loc[1] + h // 2
        return (center_x, center_y, float(max_val))

    return None
