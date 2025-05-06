import { Component, OnInit, AfterViewInit, ElementRef, Renderer2, HostListener, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from '../core/services/account.service';


@Component({
  selector: 'app-homepage',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss'],
  encapsulation: ViewEncapsulation.None // Désactive l'encapsulation des styles
})
export class HomepageComponent implements OnInit, AfterViewInit {
  isLoggedIn = false;
  userName = '';

  // Define appComponents for the app components section
  appComponents = [
    { icon: 'grid_view_rounded', title: 'Dashboard', desc: 'Vue analytique de vos activités' },
    { icon: 'home_repair_service_rounded', title: 'Équipements', desc: 'Gestion de vos équipements' },
    { icon: 'construction_rounded', title: 'Interventions', desc: 'Suivi des interventions' },
    { icon: 'view_in_art_rounded', title: 'Ressources', desc: 'Gestion des ressources' },
    { icon: 'library_books', title: 'Rapports', desc: 'Génération de rapports' },
    { icon: 'chat_bubble_rounded', title: 'Chatbot', desc: 'Assistant intelligent' }
  ];

  // Define gmaoTickerWords for the ticker section
  gmaoTickerWords = [
    'GMAO', 'Maintenance', 'Gestion', 'Actifs', 'Interventions', 
    'Rapports', 'Analyse', 'Préventive', 'Corrective', 'Planification',
    'Équipements', 'Ressources', 'Tableau de bord', 'Efficacité', 'Performance'
  ];

  gmaoWords = [
    { text: 'Maintenance', delay: '0s', top: '10px' },
    { text: 'BI Dashboard', delay: '1.5s', top: '30px' },
    { text: 'Reports', delay: '3s', top: '45px' },
    { text: 'Smart GMAO App', delay: '4.5s', top: '20px' },
    { text: 'GMAO Chat', delay: '6s', top: '35px' },
    { text: 'Intelligent Assistant', delay: '7.5s', top: '50px' },
    { text: 'Preventive', delay: '9s', top: '15px' },
    { text: 'Predictive', delay: '10.5s', top: '40px' },
    { text: 'Asset Tracking', delay: '12s', top: '25px' },
    { text: 'Mobile GMAO', delay: '13.5s', top: '55px' },
    { text: 'Real-time Alerts', delay: '15s', top: '10px' },
    { text: 'Planning', delay: '16.5s', top: '30px' },
    { text: 'Analytics', delay: '18s', top: '45px' },
    { text: 'Team Collaboration', delay: '19.5s', top: '20px' },
  ];

  constructor(
    private router: Router, 
    private accountService: AccountService,
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    // Check if user is already logged in
    this.accountService.getUserInfo().subscribe(user => {
      this.isLoggedIn = !!user;
      if (user) {
        this.userName = user.firstName;
      }
    });
  }

  ngAfterViewInit() {
    // Scroll animation for elements with appScrollAnimate
    const animatedEls = this.el.nativeElement.querySelectorAll('[appScrollAnimate]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.renderer.addClass(entry.target, 'in-view');
        }
      });
    }, { threshold: 0.15 });
    animatedEls.forEach((el: HTMLElement) => observer.observe(el));
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Add the scrolled class to navbar when scrolled down
    const navbar = this.el.nativeElement.querySelector('.navbar');
    if (window.scrollY > 50) {
      this.renderer.addClass(navbar, 'scrolled');
    } else {
      this.renderer.removeClass(navbar, 'scrolled');
    }
  }

  goToLogin() {
    // If already logged in, go to dashboard
    if (this.isLoggedIn) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/login']);
    }
  }
}