import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { minify as minifyJS } from 'terser';
import { minify as minifyHTML } from 'html-minifier-terser';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { promisify } from 'util';
import zlib from 'zlib';

// Directories
const srcDir = './src';
const distDir = './dist';
const archivePath = './dist.zip';

// Promisify zlib to get a promise-based gzip size calculation
const gzipSize = promisify(zlib.gzip);

// Clean up dist directory
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

// Minify and copy files
async function build() {
    const files = readdirSync(srcDir);
    for (const file of files) {
        const filePath = join(srcDir, file);
        const outPath = join(distDir, file);

        if (file.endsWith('.js')) {
            // Minify JavaScript
            const code = readFileSync(filePath, 'utf8');
            try {
                const result = await minifyJS(code, {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                        pure_getters: true,
                        passes: 3,
                    },
                    mangle: {
                        properties: true,
                        toplevel: true,
                    },
                });
                writeFileSync(outPath, result.code, 'utf8');
                console.log(`Minified JS: ${file}`);
            } catch (error) {
                console.error(`Error minifying JS: ${file}`, error);
            }
        } else if (file.endsWith('.html')) {
            // Minify HTML
            const html = readFileSync(filePath, 'utf8');
            try {
                const minifiedHTML = await minifyHTML(html, {
                    collapseWhitespace: true,
                    removeComments: true,
                    minifyCSS: true, // Minify inline CSS
                    minifyJS: true,  // Minify inline JS
                });
                writeFileSync(outPath, minifiedHTML, 'utf8');
                console.log(`Minified HTML: ${file}`);
            } catch (error) {
                console.error(`Error minifying HTML: ${file}`, error);
            }
        } else {
            // Copy non-JS/HTML files (CSS, images, etc.)
            const content = readFileSync(filePath);
            writeFileSync(outPath, content);
            console.log(`Copied: ${file}`);
        }
    }

    // Calculate the size of the dist directory
    const distSize = await calculateDirectorySize(distDir);

    await createArchive();

    // Calculate the size of the archive
    const archiveSize = statSync(archivePath).size;

    // Calculate the savings
    const savings = distSize - archiveSize;
    const percentageSaved = (savings / distSize) * 100;

    console.log(`Directory size: ${(distSize / 1024).toFixed(2)} KB`);
    console.log(`Archive size: ${(archiveSize / 1024).toFixed(2)} KB`);
    console.log(`Savings: ${(savings / 1024).toFixed(2)} KB`);
    console.log(`Percentage Saved: ${percentageSaved.toFixed(2)}%`);

    // Calculate and print gzip size of the archive
    const gzipBuffer = await gzipSize(readFileSync(archivePath));
    console.log(`Gzip size of archive: ${(gzipBuffer.length / 1024).toFixed(2)} KB`);


    console.log('Build complete!');
}

// Function to calculate the size of a directory
async function calculateDirectorySize(directory) {
    return new Promise((resolve, reject) => {
        let totalSize = 0;
        const calculateSize = (path) => {
            return new Promise((resolve, reject) => {
                readdirSync(path).forEach(file => {
                    const filePath = join(path, file);
                    const stats = statSync(filePath);
                    if (stats.isDirectory()) {
                        calculateSize(filePath).then(size => {
                            totalSize += size;
                            resolve();
                        }).catch(reject);
                    } else {
                        totalSize += stats.size;
                    }
                });
                resolve();
            });
        };

        calculateSize(directory).then(() => {
            resolve(totalSize);
        }).catch(reject);
    });
}

// Function to create a ZIP archive
async function createArchive() {
    return new Promise((resolve, reject) => {
        const output = createWriteStream(archivePath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            resolve();
        });

        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(distDir, false);
        archive.finalize();
    });
}

build().catch(err => console.error(err));
