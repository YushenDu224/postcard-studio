import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const paths=['README.md','package.json','CMakeLists.txt','.gitignore','.github/workflows/pages.yml','技术方案.md'];
for (const dir of ['core','docs','tests','scripts']) {
  for(const name of await fs.readdir(dir))if(!name.startsWith('core.generated'))paths.push(`${dir}/${name}`);
}
const result={};
for(const file of paths.sort()) {
  const bytes=await fs.readFile(file);
  result[file]=crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}
console.log(JSON.stringify(result));
