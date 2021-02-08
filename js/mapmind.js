/*
 * LICENSE
 * MapMind was developed by Harmen G. Zijp at the Cooperative University of Amersfoort. The code is distributed under the Simple Public License 2.0 which can be found at https://opensource.org/licenses/Simple-2.0
 * 
 * Contact: harmen [at] universiteitamersfoort [dot] nl
*/

// code for rendering elevation map using gpu shaders
var heights = new Float32Array([-1.000,-0.625,-0.375,-0.250,-0.125,-0.019,-0.003,-0.001,0.000,0.000,0.001,0.063,0.250,0.375,0.625,1.000]);
var reds   = new Float32Array([ 0.06, 0.03, 0.00, 0.00, 0.00, 0.20, 0.30, 0.96,1.00,0.00,0.05,0.76,0.64,0.52,0.44,0.84]);
var greens = new Float32Array([ 0.00, 0.00, 0.00, 0.26, 0.38, 0.59, 0.76, 0.98,0.66,0.36,0.47,0.72,0.28,0.11,0.41,0.84]);
var blues  = new Float32Array([ 0.53, 0.59, 0.68, 0.73, 0.67, 0.82, 0.79, 0.60,0.49,0.25,0.19,0.41,0.22,0.30,0.41,0.84]);

var waterlevelSimulationPass = 1;
var elevationTextureIndex = 1;

var ahnDraw = function(extent, resolution, pixelRatio, size, projection) {
	if (simulate) {
		// pass 0
		ahnSimulate();
		// pass 1
		ahnSimulate();
	}
	
	// setup GLSL program
	gl.useProgram(shaderColormap);
	
	// Bind the elevation map to texture register 0
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, elevationTextureIndex ? textureElevationB : textureElevationA);
	gl.uniform1i(gl.getUniformLocation(shaderColormap, "elevationMap"), 0);
	
	// Bind the waterlevel map to texture register 1
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, waterlevelSimulationPass ? textureWaterLevelB : textureWaterLevelA);
	gl.uniform1i(gl.getUniformLocation(shaderColormap, "waterlevelMap"), 1);
	
	// Provide texture coordinates
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		var texCoordLocation = gl.getAttribLocation(shaderColormap, "a_texCoord");
		gl.enableVertexAttribArray(texCoordLocation);
		gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Set the resolution
	gl.uniform2f(gl.getUniformLocation(shaderColormap, "u_resolution"), width, height);
	
	// Pass other variables
	gl.uniform1fv(gl.getUniformLocation(shaderColormap, "heights"), heights);
	gl.uniform1fv(gl.getUniformLocation(shaderColormap, "reds"), reds);
	gl.uniform1fv(gl.getUniformLocation(shaderColormap, "greens"), greens);
	gl.uniform1fv(gl.getUniformLocation(shaderColormap, "blues"), blues);
	//~ gl.uniform1f(gl.getUniformLocation(shaderColormap, "level"), settings.level);
	gl.uniform1f(gl.getUniformLocation(shaderColormap, "level"), (settings.level-zmin)/(zmax-zmin));
	gl.uniform1f(gl.getUniformLocation(shaderColormap, "zmin"), zmin);
	gl.uniform1f(gl.getUniformLocation(shaderColormap, "zmax"), zmax);
	
	// Look up where the vertex data needs to go
	gl.bindBuffer(gl.ARRAY_BUFFER, fboCoordBuffer);
		var positionLocation = gl.getAttribLocation(shaderColormap, "a_position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Draw the rectangle
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		var canvasOrigin = map.getPixelFromCoordinate([extent[0], extent[3]]);
		gl.viewport(-pixelRatio*canvasOrigin[0], -pixelRatio*canvasOrigin[1], pixelRatio*width, pixelRatio*height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	// Unbind the textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	// Unbind the shader
	gl.useProgram(null);
	
	if (simulate) setTimeout(
		function() {
			ahn.getSource().changed();
		},
		100
	);
	return glCanvas;
}

function ahnSimulate() {
	// Bind our automaton shader
	gl.useProgram(shaderAutomaton);
	
	// Bind the waterlevel map to texture register 0
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, waterlevelSimulationPass ? textureWaterLevelB : textureWaterLevelA);
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "waterlevelMap"), 0); // pass texture B as a sampler to the shader
	
	// Bind the elevation map to texture register 1
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, elevationTextureIndex ? textureElevationB : textureElevationA);
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "elevationMap"), 1);
	
	// Provide texture coordinates
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		var texCoordLocation = gl.getAttribLocation(shaderAutomaton, "a_texCoord");
		gl.enableVertexAttribArray(texCoordLocation);
		gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Set the resolution
	gl.uniform2f(gl.getUniformLocation(shaderAutomaton, "u_resolution"), width, height);
	
	// Pass other variables
	gl.uniform1f(gl.getUniformLocation(shaderAutomaton, "zmin"), zmin);
	gl.uniform1f(gl.getUniformLocation(shaderAutomaton, "zmax"), zmax);
	gl.uniform1f(gl.getUniformLocation(shaderAutomaton, "du"), 1.0/width); // pass in the width of the cells
	gl.uniform1f(gl.getUniformLocation(shaderAutomaton, "dv"), 1.0/height); // pass in the height of the cells
	gl.uniform1f(gl.getUniformLocation(shaderAutomaton, "dw"), dw); // pass water increment
	
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "rain"), raining ? 1 : 0);
	
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "nSources"), sourcesList.getFeatures().length);
	gl.uniform2fv(gl.getUniformLocation(shaderAutomaton, "sourceCoords"), sourcesCoordList);
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "nSinks"), sinksList.getFeatures().length);
	gl.uniform2fv(gl.getUniformLocation(shaderAutomaton, "sinkCoords"), sinksCoordList);
	
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "pass"), waterlevelSimulationPass);
	gl.uniform1i(gl.getUniformLocation(shaderAutomaton, "rseed"), Math.floor(Math.random()*8));
	
	// Look up where the vertex data needs to go
	gl.bindBuffer(gl.ARRAY_BUFFER, fboCoordBuffer);
		var positionLocation = gl.getAttribLocation(shaderAutomaton, "a_position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Draw the rectangle
	gl.bindFramebuffer(gl.FRAMEBUFFER, waterlevelSimulationPass ? fboWaterLevelA : fboWaterLevelB);
		gl.viewport(0, 0, width, height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	// Unbind the textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	// Unbind the shader
	gl.useProgram(null);
	
	waterlevelSimulationPass = 1 - waterlevelSimulationPass;
}

function ahnInterpolate(begin, end) {
	// Bind our automaton shader
	gl.useProgram(shaderSculpt);
	
	// Bind the elevation map to texture register 0
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, elevationTextureIndex ? textureElevationB : textureElevationA);
	gl.uniform1i(gl.getUniformLocation(shaderSculpt, "elevationMap"), 0);
	
	// Provide texture coordinates
	gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
		var texCoordLocation = gl.getAttribLocation(shaderSculpt, "a_texCoord");
		gl.enableVertexAttribArray(texCoordLocation);
		gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Set the resolution
	gl.uniform2f(gl.getUniformLocation(shaderSculpt, "u_resolution"), width, height);
	
	// Pass other variables
	gl.uniform2f(gl.getUniformLocation(shaderSculpt, "begin"), 1.0*begin[0]/width, 1.0*begin[1]/height);
	gl.uniform2f(gl.getUniformLocation(shaderSculpt, "end"), 1.0*end[0]/width, 1.0*end[1]/height);
	gl.uniform1f(gl.getUniformLocation(shaderSculpt, "dp"), 3.0/width);
	
	// Look up where the vertex data needs to go
	gl.bindBuffer(gl.ARRAY_BUFFER, fboCoordBuffer);
		var positionLocation = gl.getAttribLocation(shaderSculpt, "a_position");
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	
	// Draw the rectangle
	gl.bindFramebuffer(gl.FRAMEBUFFER, elevationTextureIndex ? fboElevationA : fboElevationB);
		gl.viewport(0, 0, width, height);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	// Unbind the textures
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, null);
	
	// Unbind the shader
	gl.useProgram(null);
	
	elevationTextureIndex = 1 - elevationTextureIndex;
}
