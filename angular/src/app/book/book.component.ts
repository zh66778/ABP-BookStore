import {
  FormGroup,
  FormBuilder, 
  Validators, 
  FormsModule, 
  ReactiveFormsModule
} from '@angular/forms';
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe, AsyncPipe } from '@angular/common'; // 添加 CommonModule 和 AsyncPipe
import { NgbDatepickerModule, NgbDateStruct, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import {
  ListService,
  PagedResultDto, 
  LocalizationPipe, 
  PermissionDirective, 
  AutofocusDirective
} from '@abp/ng.core';
import {
  ConfirmationService,
  Confirmation,
  NgxDatatableDefaultDirective,
  NgxDatatableListDirective,
  ModalCloseDirective,
  ModalComponent
} from '@abp/ng.theme.shared';
import { BookService, BookDto, bookTypeOptions, AuthorLookupDto, CreateUpdateBookDto } from '../proxy/books';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  imports: [
    CommonModule,          // 添加这个 - 支持 @for 等控制流语法
    FormsModule,
    ReactiveFormsModule,
    NgbDatepickerModule,
    NgxDatatableModule,
    NgbDropdownModule,
    ModalComponent,
    AutofocusDirective,
    NgxDatatableListDirective,
    NgxDatatableDefaultDirective,
    PermissionDirective,
    ModalCloseDirective,
    LocalizationPipe,
    DatePipe,
    AsyncPipe              // 添加这个 - 支持 async 管道
  ],
  providers: [ListService],
})
export class BookComponent implements OnInit {
  public readonly list = inject(ListService);
  private bookService = inject(BookService);
  private fb = inject(FormBuilder);
  private confirmation = inject(ConfirmationService);

  book = { items: [], totalCount: 0 } as PagedResultDto<BookDto>;
  selectedBook = {} as BookDto;
  form: FormGroup;
  bookTypes = bookTypeOptions;
  isModalOpen = false;
  
  authors$: Observable<AuthorLookupDto[]>;

  constructor() {
    this.authors$ = this.bookService.getAuthorLookup().pipe(
      map((response) => response.items || [])
    );
    
    this.buildForm();
  }

  ngOnInit() {
    const bookStreamCreator = query => this.bookService.getList(query);

    this.list.hookToQuery(bookStreamCreator).subscribe(response => {
      this.book = response;
    });
  }

  createBook() {
    this.selectedBook = {} as BookDto;
    this.buildForm();
    this.isModalOpen = true;
  }

  editBook(id: string) {
    this.bookService.get(id).subscribe(book => {
      this.selectedBook = book;
      this.buildForm();
      this.isModalOpen = true;
    });
  }

  buildForm() {
    this.form = this.fb.group({
      authorId: [this.selectedBook.authorId || null, Validators.required],
      name: [this.selectedBook.name || '', Validators.required],
      type: [this.selectedBook.type || null, Validators.required],
      publishDate: [
        this.selectedBook.publishDate ? this.parseDate(this.selectedBook.publishDate) : null,
        Validators.required,
      ],
      price: [this.selectedBook.price || null, Validators.required],
    });
  }

  save() {
    if (this.form.invalid) {
      return;
    }

    const formValue = this.form.value;
    const requestData: CreateUpdateBookDto = {
      ...formValue,
      publishDate: this.formatDate(formValue.publishDate),
    };

    let request = this.bookService.create(requestData);
    if (this.selectedBook.id) {
      request = this.bookService.update(this.selectedBook.id, requestData);
    }

    request.subscribe(() => {
      this.isModalOpen = false;
      this.form.reset();
      this.list.get();
    });
  }

  delete(id: string) {
    this.confirmation.warn('::AreYouSureToDelete', '::AreYouSure').subscribe(status => {
      if (status === Confirmation.Status.confirm) {
        this.bookService.delete(id).subscribe(() => this.list.get());
      }
    });
  }

  private parseDate(value: string | Date): NgbDateStruct | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }

    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  private formatDate(dateStruct: NgbDateStruct | null): string {
    if (!dateStruct) {
      return '';
    }

    const date = new Date(dateStruct.year, dateStruct.month - 1, dateStruct.day);
    return date.toISOString().split('T')[0];
  }
}
