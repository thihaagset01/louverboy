from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
import shutil
import subprocess
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# Create the static folder if it doesn't exist
os.makedirs("static", exist_ok=True)



app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.post("/render/")
async def render(image: UploadFile = File(...)):
    input_path = "input.png"
    output_path = "static/output.png"
    glb_path = "models/phone.glb"

    # Save uploaded image to disk
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # Run Blender script
    subprocess.run([
        "/Applications/Blender.app/Contents/MacOS/Blender", "--background",
        "--python", "blender_scripts/render_with_model.py",
        "--", input_path, output_path, glb_path
    ], check=True)

    # Return the path to the rendered image
    return JSONResponse(content={"output_image_url": f"http://localhost:8000/{output_path}"})