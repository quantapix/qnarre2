import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';

import {Crisis} from '../crisis';
import {DialogService} from '../../dialog.serv';

@Component({
  selector: 'qnr-crisis-detail',
  templateUrl: './crisis-detail.component.html',
  styleUrls: ['./crisis-detail.component.scss']
})
export class CrisisDetailComponent implements OnInit {
  crisis?: Crisis;
  editName = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public dialogService: DialogService
  ) {}

  ngOnInit() {
    this.route.data.subscribe((d: any) => {
      this.editName = d.crisis.name;
      this.crisis = d.crisis;
    });
  }

  cancel() {
    this.gotoCrises();
  }

  save() {
    this.crisis!.name = this.editName;
    this.gotoCrises();
  }

  canDeactivate(): Observable<boolean> | boolean {
    if (!this.crisis || this.crisis.name === this.editName) return true;
    return this.dialogService.confirm('Discard changes?');
  }

  gotoCrises() {
    const id = this.crisis ? this.crisis.id : null;
    this.router.navigate(['../', {id, foo: 'foo'}], {relativeTo: this.route});
  }
}
