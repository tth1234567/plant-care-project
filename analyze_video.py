import cv2
import base64
import os

video_path = r"E:\cursor_workspace\plant-care-project-main\d674060bf792ebcadfaf122d19bd0571.mp4"
output_dir = r"E:\cursor_workspace\plant-care-project-main\video_frames"
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
duration = total_frames / fps

print(f"FPS: {fps}")
print(f"Total frames: {total_frames}")
print(f"Duration: {duration:.2f} seconds")
print(f"Width: {cap.get(cv2.CAP_PROP_FRAME_WIDTH)}")
print(f"Height: {cap.get(cv2.CAP_PROP_FRAME_HEIGHT)}")

# Extract frames every 2 seconds
interval_seconds = 2
interval_frames = int(fps * interval_seconds)

frame_count = 0
saved_count = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    if frame_count % interval_frames == 0:
        timestamp = frame_count / fps
        filename = os.path.join(output_dir, f"frame_{saved_count:04d}_t{timestamp:.2f}s.jpg")
        cv2.imwrite(filename, frame)
        saved_count += 1
    
    frame_count += 1

cap.release()
print(f"\nSaved {saved_count} frames to {output_dir}")
