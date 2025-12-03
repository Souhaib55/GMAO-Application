import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

interface Report {
  id: string;
  name: string;
  description: string;
  embedUrl: string;
  icon: string;
}

@Component({
  selector: 'app-rapports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rapports.component.html',
  styleUrls: ['./rapports.component.scss']
})
export class RapportsComponent implements OnInit {
  reports: Report[] = [
    {
      id: 'gmao-main',
      name: 'Rapport GMAO Principal',
      description: 'Vue d\'ensemble des interventions, équipements et performances',
      embedUrl: '', // User will configure their Power BI embed URL
      icon: 'chart-bar'
    }
  ];

  selectedReport: Report | null = null;
  safeEmbedUrl: SafeResourceUrl | null = null;
  isLoading = true;
  showConfigModal = false;
  configUrl = '';

  // Default Power BI embed URL placeholder
  private powerBiBaseUrl = 'https://app.powerbi.com/reportEmbed';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit(): void {
    // Load saved config from localStorage
    const savedConfig = localStorage.getItem('powerbi-config');
    if (savedConfig) {
      const config = JSON.parse(savedConfig);
      if (config.embedUrl) {
        this.reports[0].embedUrl = config.embedUrl;
      }
    }

    // Auto-select first report if URL is configured
    if (this.reports[0].embedUrl) {
      this.selectReport(this.reports[0]);
    }
    
    this.isLoading = false;
  }

  selectReport(report: Report): void {
    this.selectedReport = report;
    if (report.embedUrl) {
      this.safeEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(report.embedUrl);
    } else {
      this.safeEmbedUrl = null;
    }
  }

  openConfigModal(): void {
    this.configUrl = this.reports[0].embedUrl || '';
    this.showConfigModal = true;
  }

  closeConfigModal(): void {
    this.showConfigModal = false;
    this.configUrl = '';
  }

  saveConfig(): void {
    if (this.configUrl) {
      this.reports[0].embedUrl = this.configUrl;
      localStorage.setItem('powerbi-config', JSON.stringify({ embedUrl: this.configUrl }));
      this.selectReport(this.reports[0]);
    }
    this.closeConfigModal();
  }

  refreshReport(): void {
    if (this.selectedReport) {
      const currentReport = this.selectedReport;
      this.selectedReport = null;
      this.safeEmbedUrl = null;
      
      setTimeout(() => {
        this.selectReport(currentReport);
      }, 100);
    }
  }

  toggleFullscreen(): void {
    const iframe = document.querySelector('.report-iframe') as HTMLIFrameElement;
    if (iframe) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        iframe.requestFullscreen();
      }
    }
  }
}
