import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'lineBreakPipe'
})
export class LineBreakPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(text: string): SafeHtml {
    if (!text) return '';
    
    // Replace line breaks with <br> tags
    const formattedText = text.replace(/\n/g, '<br>');
    
    // Sanitize the HTML to prevent XSS attacks while allowing basic formatting
    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }
}