import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import NewsletterArticle from '@/components/marketing/newsletter-article';
import PostThumbnail from '@/components/marketing/post-thumbnail';
import {articleEmail} from './newsletter/generate';
import type {Article} from './newsletter/core';
import {photoSourceHref} from './photo-source';

const article:Article={title:'Test article',excerpt:'Test excerpt',introduction:'Introduction',sections:[],questions:[]};
const attribution='Jeff Brown Yachts brokerage listing photography (Gray Yachts)';
const photo={id:'stored-photo',url:'/newsletter/brokerage/photo.jpg',alt:'Vessel at the dock',caption:'Brokerage photography',credit:'Gray Yachts',source:attribution};
const renderers={
 article:(source:string)=>renderToStaticMarkup(createElement(NewsletterArticle,{article,images:[{...photo,source}]})),
 thumbnail:(source:string)=>renderToStaticMarkup(createElement(PostThumbnail,{photo:{...photo,source}})),
 email:(source:string)=>articleEmail(article,[{...photo,source}]),
};
describe('photo attribution links',()=>{
 it.each([attribution,'/relative','//example.com','javascript:alert(1)','data:text/html,test','https://','https://user:password@example.com'])('does not link non-web or credential sources: %s',source=>{
  expect(photoSourceHref(source)).toBeUndefined();
 });
 for(const [name,render] of Object.entries(renderers)){
  it(`${name} preserves saved prose credits without a broken relative link`,()=>{
   const html=render(attribution);
   expect(html).toContain(attribution);
   expect(html).not.toMatch(/<a\b[^>]*href=/);
  });
  it(`${name} retains valid source links`,()=>{
   expect(render('https://example.com/photo?x=1&y=2')).toContain('href="https://example.com/photo?x=1&amp;y=2"');
  });
  it(`${name} escapes unsafe source text without a clickable scheme`,()=>{
   const html=render('javascript:<script>alert(1)</script>');
   expect(html).not.toMatch(/<a\b[^>]*href=/);
   expect(html).not.toContain('<script>');
   expect(html).toContain('&lt;script&gt;');
  });
 }
});
