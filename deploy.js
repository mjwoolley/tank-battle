const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create a temporary deployment directory
const tempDir = path.join(__dirname, 'deploy-temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Directories and files to exclude
const excludeDirs = [
  'Cascade Conversations and Video',
  '.git',
  'node_modules',
  'deploy-temp'
];

// Function to copy files recursively
function copyFilesRecursively(source, destination) {
  // Check if the source is a directory
  if (fs.statSync(source).isDirectory()) {
    // Skip excluded directories
    const dirName = path.basename(source);
    if (excludeDirs.includes(dirName)) {
      console.log(`Skipping excluded directory: ${dirName}`);
      return;
    }

    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }

    // Copy all files and subdirectories
    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      
      // Skip large video files
      if (file.endsWith('.mp4') || file.endsWith('.mov') || file.endsWith('.avi') || file.endsWith('.wmv')) {
        console.log(`Skipping large video file: ${file}`);
        continue;
      }
      
      copyFilesRecursively(sourcePath, destPath);
    }
  } else {
    // Copy the file
    fs.copyFileSync(source, destination);
  }
}

// Copy all files to the temporary directory
console.log('Copying files to temporary directory...');
copyFilesRecursively(__dirname, tempDir);

// Deploy to Netlify from the temporary directory
console.log('Deploying to Netlify...');
try {
  execSync('npx netlify-cli deploy --prod', { 
    cwd: tempDir, 
    stdio: 'inherit'
  });
  console.log('Deployment successful!');
} catch (error) {
  console.error('Deployment failed:', error);
}

// Clean up temporary directory
console.log('Cleaning up...');
fs.rmSync(tempDir, { recursive: true, force: true });
console.log('Done!');
