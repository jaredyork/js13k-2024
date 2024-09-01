import { exec } from 'child_process';
import browserSync from 'browser-sync';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the equivalent of __dirname in ES modules
const __dirname = dirname(fileURLToPath(import.meta.url));

// Define the path to your build script
const buildScript = join(__dirname, 'build.js');

// Function to run the build script
function runBuildScript(cb) {
    exec(`node ${buildScript}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error during build: ${error.message}`);
            return;
        }

        if (stderr) {
            console.error(`Build stderr: ${stderr}`);
        }

        console.log(`Build stdout: ${stdout}`);
        cb(); // Call the callback to signal completion
    });
}

// Start BrowserSync
browserSync.init({
    server: './dist', // Serve the files from the `./dist` directory
    open: false, // Set to true if you want the browser to open automatically
    notify: false, // Set to true if you want BrowserSync notifications
    files: './src/**/*', // Watch the `./src` directory for changes
    middleware: [(req, res, next) => runBuildScript(next)], // Run build script before serving files
});