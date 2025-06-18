# blender_script.py
import bpy
import sys

# Parse CLI args
args = sys.argv[sys.argv.index("--") + 1:]
image_path, mask_path, output_path = args

# === Clear scene ===
bpy.ops.wm.read_factory_settings(use_empty=True)

# === Set render resolution ===
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.filepath = output_path
bpy.context.scene.render.resolution_x = 1024
bpy.context.scene.render.resolution_y = 1024

# === Setup camera ===
cam = bpy.data.cameras.new("Camera")
cam_obj = bpy.data.objects.new("Camera", cam)
bpy.context.scene.collection.objects.link(cam_obj)
cam_obj.location = (0, -3, 1.5)
cam_obj.rotation_euler = (1.1, 0, 0)
bpy.context.scene.camera = cam_obj

# === Setup light ===
light_data = bpy.data.lights.new(name="light", type='POINT')
light_obj = bpy.data.objects.new(name="light", object_data=light_data)
bpy.context.collection.objects.link(light_obj)
light_obj.location = (0, -2, 4)

# === Set background image ===
img = bpy.data.images.load(image_path)
bg = bpy.data.objects.new("Background", bpy.data.meshes.new("BGMesh"))
bpy.context.collection.objects.link(bg)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = bg
bpy.ops.object.editmode_toggle()
bpy.ops.mesh.primitive_plane_add(size=6)
bpy.ops.object.editmode_toggle()

mat = bpy.data.materials.new(name="BGMaterial")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
tex_image = mat.node_tree.nodes.new("ShaderNodeTexImage")
tex_image.image = img
mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_image.outputs['Color'])
bg.data.materials.append(mat)

# === Import model ===
bpy.ops.import_scene.gltf(filepath="models/my_model.glb")
model = bpy.context.selected_objects[0]
model.location = (0, 0, 0)

# TODO: Use `mask_path` to determine exact insert location (you can use OpenCV or similar)

# === Render ===
bpy.ops.render.render(write_still=True)