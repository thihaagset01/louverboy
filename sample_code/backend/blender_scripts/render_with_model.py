import bpy
import sys
import os

# --- Get args passed after "--"
args = sys.argv[sys.argv.index("--") + 1:]
image_path = args[0]
render_output_path = args[1]
glb_path = args[2]

# --- Reset Scene ---
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# --- Import Image as Background (for compositor) ---
img = bpy.data.images.load(image_path)

# --- Import GLB ---
if not os.path.exists(glb_path):
    raise FileNotFoundError(f"GLB file not found: {glb_path}")
bpy.ops.import_scene.gltf(filepath=glb_path)
model = bpy.context.selected_objects[0]
model.location = (0, 0, 1)   # Raise above ground
model.scale = (0.5, 0.5, 0.5)      # Scale up to ensure visibility

# --- Add Camera ---
bpy.ops.object.camera_add(location=(3, -3, 2), rotation=(1.1, 0, 0.9))
cam = bpy.context.active_object
bpy.context.scene.camera = cam
cam.data.lens = 5  # in mm, common values: 18 (wide) – 135 (telephoto)

# Track camera to model
track = cam.constraints.new(type='TRACK_TO')
track.target = model
track.track_axis = 'TRACK_NEGATIVE_Z'
track.up_axis = 'UP_Y'

# --- Add Lighting (Point light for small scenes) ---
bpy.ops.object.light_add(type='POINT', location=(3, -3, 3))
light = bpy.context.active_object
light.data.energy = 500000

# --- Add Shadow Catcher Plane ---
bpy.ops.mesh.primitive_plane_add(size=10, location=(0, 0, 0))
plane = bpy.context.active_object
plane.name = "ShadowCatcher"
plane.rotation_euler[0] = 0

# Set plane as shadow catcher
plane_mat = bpy.data.materials.new(name="ShadowMat")
plane_mat.use_nodes = True
plane.data.materials.append(plane_mat)
plane.cycles.is_shadow_catcher = True

# --- Render Settings ---
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'GPU' if bpy.context.preferences.addons['cycles'].preferences.compute_device_type != 'NONE' else 'CPU'

scene.render.film_transparent = True  # Set to False to debug background

# --- Compositing Setup ---
scene.use_nodes = True
tree = scene.node_tree
tree.nodes.clear()

# Nodes
bg_node = tree.nodes.new(type='CompositorNodeImage')
bg_node.image = img

rl_node = tree.nodes.new(type='CompositorNodeRLayers')

alpha_node = tree.nodes.new(type='CompositorNodeAlphaOver')
alpha_node.location.x += 400
alpha_node.inputs[0].default_value = 1.0  # Ensure mix factor = 1

comp_node = tree.nodes.new(type='CompositorNodeComposite')

# Connect
tree.links.new(rl_node.outputs['Image'], alpha_node.inputs[2])
tree.links.new(bg_node.outputs['Image'], alpha_node.inputs[1])
tree.links.new(alpha_node.outputs['Image'], comp_node.inputs['Image'])

# --- Render to File ---
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = render_output_path
bpy.ops.render.render(write_still=True)