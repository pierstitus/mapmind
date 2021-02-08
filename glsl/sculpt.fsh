/*
 * LICENSE
 * MapMind was developed by Harmen G. Zijp at the Cooperative University of Amersfoort. The code is distributed under the Simple Public License 2.0 which can be found at https://opensource.org/licenses/Simple-2.0
 * 
 * Contact: harmen [at] universiteitamersfoort [dot] nl
*/

// terrain sculpting fragment shader
precision mediump float;

// our texture
uniform sampler2D elevationMap;

// declare the texture coordinate that is passed in from the fragment shader
varying vec2 v_texCoord;

// declare additional variables we pass from the main program into this shader
uniform vec2 begin;
uniform vec2 end;
uniform float dp;

void main() {
	vec2 p;
	
	// find shortest distance between line and gridpoint
	float a = (end.y - begin.y)/(end.x - begin.x);
	float b = -1.0;
	float c = begin.y - a*begin.x;
	float d = abs(a*v_texCoord.x + b*v_texCoord.y + c)/sqrt(a*a + b*b);
	
	// find intersection of line and line of shortest distance to gridpoint
	p.x = (b*( b*v_texCoord.x - a*v_texCoord.y) - a*c)/(a*a + b*b);
	p.y = (a*(-b*v_texCoord.x + a*v_texCoord.y) - b*c)/(a*a + b*b);
	
	bool between = ((p.x>begin.x && p.x<end.x) || (p.x<begin.x && p.x>end.x)) && ((p.y>begin.y && p.y<end.y) || (p.y<begin.y && p.y>end.y));
	
	float h;
	if (between && d < dp) {
		// interpolate elevation
		float h1 = texture2D(elevationMap, begin).r;
		float h2 = texture2D(elevationMap, end).r;
		
		h = h1*distance(p, end)/distance(begin, end) + h2*distance(p, begin)/distance(begin, end);
	}
	else h = texture2D(elevationMap, v_texCoord).r;
	gl_FragColor = vec4(h, 0.0, 0.0, 0.0); 
}
