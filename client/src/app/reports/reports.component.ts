import { Component } from '@angular/core';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  reportUrl = 'https://app.powerbi.com/reportEmbed?reportId=ba62dc4f-fb8b-4c2b-8413-5335526bfefd&autoAuth=true&ctid=dbd6664d-4eb9-46eb-99d8-5c43ba153c61';
}