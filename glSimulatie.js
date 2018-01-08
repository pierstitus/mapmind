var ahnDraw = function(extent, resolution, pixelRatio, size, projection) {
	if (counter % 2 == 0) glBindFramebuffer(GL_FRAMEBUFFER, fboWaterLevelA); //bind FBO A to set textureA as the output texture.
	else glBindFramebuffer(GL_FRAMEBUFFER, fboWaterLevelB); //bind FBO B to set textureB as the output texture.
	
	setupViewport(fboWidth, fboHeight);
	
	glClearColor(0.0f, 0.0f, 0.0f, 1.0f); // Clear the background of our window to red
	glClear (GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT); //clear the ouput texture
	glLoadIdentity(); // Load the Identity Matrix to reset our drawing locations
	glPushMatrix();
		glTranslatef(0.0f, 0.0f, -1.0f);
		
		glActiveTexture(GL_TEXTURE0); //make texture register 0 active
		if (counter % 2 == 0) glBindTexture(GL_TEXTURE_2D, textureWaterLevelB); //bind textureB as out input texture
		else glBindTexture(GL_TEXTURE_2D, textureWaterLevelA); //bind textureA as out input texture
		
		glActiveTexture(GL_TEXTURE1); // make texture register 1 active
		glBindTexture(GL_TEXTURE_2D, textureElevation);
		
		glUseProgram(shaderAutomaton); //bind our automata shader
		
		glUniform1i(glGetUniformLocation(shaderAutomaton, "waterlevelMap"), 0); // pass texture B as a sampler to the shader
		glUniform1i(glGetUniformLocation(shaderAutomaton, "elevationMap"), 1);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "zmin"), zmin);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "zmax"), zmax);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "du"), 1.0/fboWidth); // pass in the width of the cells
		glUniform1f(glGetUniformLocation(shaderAutomaton, "dv"), 1.0/fboHeight); // pass in the height of the cells
		glUniform1f(glGetUniformLocation(shaderAutomaton, "dw"), dw); // pass water increment
		
		glUniform1i(glGetUniformLocation(shaderAutomaton, "drag"), drag);
		glUniform1i(glGetUniformLocation(shaderAutomaton, "flow"), flow);
		glUniform1i(glGetUniformLocation(shaderAutomaton, "rain"), rain);
		glUniform1i(glGetUniformLocation(shaderAutomaton, "levelTerrain"), levelTerrain);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "lastX"), lastX);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "lastY"), lastY);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "currX"), currX);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "currY"), currY);
		
		glUniform1f(glGetUniformLocation(shaderAutomaton, "wellX"), wellX);
		glUniform1f(glGetUniformLocation(shaderAutomaton, "wellY"), wellY);
		
		glUniform1i(glGetUniformLocation(shaderAutomaton, "pass"), counter%2);
		glUniform1i(glGetUniformLocation(shaderAutomaton, "rseed"), rand()%8);
		
		glBegin(GL_QUADS);
			glTexCoord2f(0.0f, 0.0f); glVertex3f(-1.0, -1.0, 0.0f); // The bottom left corner
			glTexCoord2f(0.0f, 1.0f); glVertex3f(-1.0, 1.0, 0.0f); // The top left corner
			glTexCoord2f(1.0f, 1.0f); glVertex3f(1.0, 1.0, 0.0f); // The top right corner
			glTexCoord2f(1.0f, 0.0f); glVertex3f(1.0, -1.0, 0.0f); // The bottom right corner
		glEnd();
		
		glUseProgram(0); //unbind the shader
		
		glBindTexture(GL_TEXTURE_2D, 0); // Unbind the texture
		glBindFramebuffer(GL_FRAMEBUFFER, 0); //unbind the FBO
	
	glPopMatrix();
	char str[20];
	if (counter%5000==0) {
		sprintf(str, "images/water%04lu.jpg", counter/5000);
		save(str);
	}
	if (counter/5000==99) exit(0);
	counter++;
}

