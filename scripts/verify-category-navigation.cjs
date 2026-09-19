const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8768';
const inventory=JSON.parse(fs.readFileSync('.site/seo-inventory.json','utf8'));
// Exercise the real app's event handlers with a small DOM adapter, not a browser/layout test.
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.value='';this.classList={add(){},remove(){}};}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  get options(){return this.children;}
  setAttribute(name,value){this[name]=value;}
  addEventListener(name,handler){this.listeners[name]=handler;}
  scrollIntoView(){}
}
function boot(pathname){
  const nodes=new Map();let location=new URL(pathname,base);
  const document={baseURI:base+'/',querySelector(selector){if(!nodes.has(selector))nodes.set(selector,new Element(selector));return nodes.get(selector);},createElement:tag=>new Element(tag)};
  const context={window:{},document,URL,URLSearchParams,console,setTimeout,clearTimeout,Option:function(text,value){return {text,value};},get location(){return location;},history:{replaceState(_state,_title,url){location=new URL(url,location);}}};
  vm.createContext(context);
  for(const name of ['gallery-data.js','gallery-model.js'])vm.runInContext(fs.readFileSync('.site/'+name,'utf8'),context);
  context.GalleryModel=context.window.GalleryModel;
  vm.runInContext(fs.readFileSync('.site/app.js','utf8'),context);
  return {context,nodes,url:()=>location,run:code=>vm.runInContext(code,context),event:(selector,type)=>document.querySelector(selector).listeners[type]({}),snapshot:()=>JSON.parse(vm.runInContext('JSON.stringify(GalleryModel.filter(images,state).map(x=>x.path))',context))};
}
(async()=>{
  const response=await fetch(base+'/tr/');assert.equal(response.status,200);
  const html=await response.text();
  const nav=html.match(/<nav aria-label="Fotoğraf kategorileri">(.*?)<\/nav>/s)[1];
  const links=[...nav.matchAll(/href="([^"]+)">([^<]+)<\/a>/g)].map(x=>({href:x[1].replace(/&amp;/g,'&'),label:x[2]}));
  assert.equal(links.length,inventory.categories.length);
  let redirects=0;
  const results=[];
  for(const category of inventory.categories){
    const link=links.find(x=>x.label===category.category);assert(link,category.category);
    assert.equal(new URL(link.href,base).searchParams.get('category'),category.slug);
    const upper=boot('/tr/');
    upper.nodes.get('#subcategory').value=category.category;upper.event('#subcategory','change');
    const expected=upper.snapshot();assert(expected.length>0);
    upper.event('#reset','click');assert.equal(upper.url().search,'');
    const lower=boot(link.href);
    assert.deepEqual(lower.snapshot(),expected,category.category);
    assert.equal(lower.nodes.get('#subcategory').value,category.category);
    assert.equal(lower.run('state.collection'),category.collection);
    assert.equal(lower.nodes.get('#gallery').children[0].children.length,Math.min(36,expected.length));
    assert.deepEqual(boot(lower.url().href).snapshot(),expected,'reload '+category.category);
    lower.event('#reset','click');assert.equal(lower.url().search,'');
    for(const prefix of ['/','/tr/'])for(const suffix of ['','/']){
      const legacy=await fetch(base+prefix+'kategori/'+category.slug+suffix,{redirect:'manual'});
      assert.equal(legacy.status,301);assert.equal(legacy.headers.get('location'),prefix+'?category='+category.slug);
      const target=await fetch(base+legacy.headers.get('location'),{redirect:'manual'});assert.equal(target.status,200);
      assert.deepEqual(boot(legacy.headers.get('location')).snapshot(),expected);redirects++;
    }
    results.push({category:category.category,collection:category.collection,photos:expected.length});
  }
  const home=boot('/tr/');
  const city=home.run("GalleryModel.featured(images).find(g=>g.collection==='sehirler'&&g.detail)");assert(city);
  home.context.testGroup=city;home.run('selectGroup(testGroup)');
  assert.equal(home.url().searchParams.get('detail'),city.detail);
  assert.deepEqual(boot(home.url().href).snapshot(),home.snapshot());
  const invalid=boot('/tr/?category=does-not-exist&detail=invalid');assert.equal(invalid.nodes.get('#subcategory').value,'');assert.equal(invalid.url().search,'');
  const badDetail=boot('/?category='+inventory.categories[0].slug+'&detail=does-not-exist');assert.equal(badDetail.nodes.get('#detail').value,'');assert(!badDetail.url().searchParams.has('detail'));
  const featured=boot('/tr/');
  for(const section of featured.nodes.get('#gallery').children){
    const link=section.children[0].children[1];assert(!link.href.includes('/kategori/'));
    const target=boot(link.href);assert(target.snapshot().length>0);
  }
  const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));
  assert(config.redirects.every(rule=>rule.statusCode===301&&!rule.destination.includes('/kategori/')));
  console.log(JSON.stringify({categories:results.length,redirects,cityDetail:city.detail,results,browserLayoutTest:'not run'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
