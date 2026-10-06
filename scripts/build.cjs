const {build} = require('esbuild');
build({entryPoints:['src/admin.js'],bundle:true,minify:true,outfile:'public/admin.js',platform:'browser',target:['es2020'],legalComments:'none'}).catch(()=>process.exit(1));
