#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

//vertices and normals binding 
layout(location = POSITION_LOCATION) in vec3 a_pos;
layout(location = NORMAL_LOCATION) in vec3 a_norm;
layout(location = UV_LOCATION) in vec2 in_uv;

//Projection Matrix and World Matrix passed as uniforms
uniform mat4 pMatrix;
uniform mat4 wMatrix;

//position and normal forwarded to frag shader
out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv; // texture

void main() {
    fs_pos = (wMatrix * vec4(a_pos, 1.0)).xyz;
    fs_norm = (wMatrix * vec4(a_norm, 0.0)).xyz;
    fs_uv = vec2(in_uv.x, 1.0-in_uv.y);
    
    gl_Position = pMatrix * vec4(a_pos, 1.0);
}