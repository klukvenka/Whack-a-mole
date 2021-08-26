#version 300 es
#define POSITION_LOCATION 0
#define NORMAL_LOCATION 1
#define UV_LOCATION 2

//vertices and normals binding 
layout(location = POSITION_LOCATION) in vec3 a_pos;
layout(location = NORMAL_LOCATION) in vec3 a_norm;
layout(location = UV_LOCATION) in vec2 in_uv;

//Projection Matrix and World Matrix passed as uniforms
uniform mat4 matrix;
uniform mat4 nMatrix; //matrix to transform normals
uniform mat4 pMatrix; //matrix to transform positions

//position and normal forwarded to frag shader
out vec3 fs_pos;
out vec3 fs_norm;
out vec2 fs_uv; // texture

void main() {

    fs_norm = mat3(nMatrix) * a_norm;
    //Transform positions from object space to world space
    fs_pos = (pMatrix * vec4(a_pos, 1.0)).xyz; 
    gl_Position = matrix * vec4(a_pos, 1.0);
    
    fs_uv = vec2(in_uv.x, 1.0-in_uv.y);
    
    
}