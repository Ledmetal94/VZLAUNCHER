"""
Python action handlers for VZLAUNCHER automation.

Each action receives a step dict and returns a result dict.
Image paths can be:
  - Absolute: used as-is
  - Relative filename: resolved against _base_dir (game screenshots dir),
    then against _shared_dir (shared HeroZone screenshots dir)
"""

import os
import time
import pyautogui
from image_match import find as image_find

# Safety: don't let pyautogui move instantly (avoids accidental corner triggers)
pyautogui.PAUSE = 0.1
pyautogui.FAILSAFE = True


def _resolve_image(image, step):
    """
    Resolve a relative image filename to a full path.
    Search order:
      1. Absolute path → use as-is
      2. _base_dir (game-specific screenshots)
      3. _shared_dir (shared platform screenshots, e.g. _herozone)
    """
    if not image:
        return image
    if os.path.isabs(image):
        return image

    base_dir = step.get("_base_dir", "")
    shared_dir = step.get("_shared_dir", "")

    if base_dir:
        candidate = os.path.join(base_dir, image)
        if os.path.exists(candidate):
            return candidate

    if shared_dir:
        candidate = os.path.join(shared_dir, image)
        if os.path.exists(candidate):
            return candidate

    # Return best-guess path even if not found (will fail at imread with clear error)
    if base_dir:
        return os.path.join(base_dir, image)
    return image


def _resolve_click_position(step):
    """
    Try image match first, fall back to explicit coordinates.
    Returns (x, y, method) or raises if neither works.
    """
    image = step.get("image")
    confidence = step.get("confidence", 0.8)

    if image:
        resolved = _resolve_image(image, step)
        match = image_find(resolved, confidence)
        if match:
            return match[0], match[1], "image_match"

    # Fallback coordinates
    fx = step.get("fallback_x")
    fy = step.get("fallback_y")
    if fx is not None and fy is not None and (int(fx) != 0 or int(fy) != 0):
        return int(fx), int(fy), "fallback"

    raise RuntimeError(
        f"Click failed: image {'not matched' if image else 'not specified'}, no valid fallback coordinates"
    )


def action_click(step):
    x, y, method = _resolve_click_position(step)
    button = step.get("button", "left")
    clicks = step.get("clicks", 1)
    pyautogui.click(x, y, button=button, clicks=clicks)
    return {"success": True, "x": x, "y": y, "method": method}


def action_double_click(step):
    x, y, method = _resolve_click_position(step)
    pyautogui.doubleClick(x, y)
    return {"success": True, "x": x, "y": y, "method": method}


def action_right_click(step):
    x, y, method = _resolve_click_position(step)
    pyautogui.rightClick(x, y)
    return {"success": True, "x": x, "y": y, "method": method}


def action_type(step):
    text = step.get("text", "")
    interval = step.get("interval", 0.02)
    pyautogui.typewrite(text, interval=interval)
    return {"success": True, "typed": len(text)}


def action_hotkey(step):
    keys = step.get("keys", [])
    if not keys:
        raise ValueError("hotkey action requires 'keys' array")
    pyautogui.hotkey(*keys)
    return {"success": True, "keys": keys}


def action_scroll(step):
    amount = step.get("amount", 3)
    x = step.get("x")
    y = step.get("y")
    kwargs = {}
    if x is not None and y is not None:
        kwargs["x"] = int(x)
        kwargs["y"] = int(y)
    pyautogui.scroll(amount, **kwargs)
    return {"success": True, "amount": amount}


def action_wait_for_image(step):
    image = step.get("image")
    if not image:
        raise ValueError("wait_for_image requires 'image' field")

    resolved = _resolve_image(image, step)
    confidence = step.get("confidence", 0.8)
    timeout = step.get("timeout", 10)
    poll_interval = step.get("poll_interval", 0.5)

    start = time.time()
    while time.time() - start < timeout:
        match = image_find(resolved, confidence)
        if match:
            return {
                "success": True,
                "x": match[0],
                "y": match[1],
                "confidence": match[2],
                "elapsed": round(time.time() - start, 2),
            }
        time.sleep(poll_interval)

    raise TimeoutError(f"Image '{image}' not found within {timeout}s")


def action_verify(step):
    image = step.get("image")
    if not image:
        raise ValueError("verify requires 'image' field")

    resolved = _resolve_image(image, step)
    confidence = step.get("confidence", 0.8)
    match = image_find(resolved, confidence)
    if match:
        return {"success": True, "found": True, "x": match[0], "y": match[1], "confidence": match[2]}
    return {"success": True, "found": False}


# Action registry
ACTIONS = {
    "click": action_click,
    "double_click": action_double_click,
    "right_click": action_right_click,
    "type": action_type,
    "hotkey": action_hotkey,
    "scroll": action_scroll,
    "wait_for_image": action_wait_for_image,
    "verify": action_verify,
}


def execute_action(step):
    action_type_name = step.get("type")
    handler = ACTIONS.get(action_type_name)
    if not handler:
        return {"success": False, "error": f"Unknown Python action: {action_type_name}"}
    return handler(step)
