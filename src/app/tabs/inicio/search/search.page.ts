import { Component, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

import { ProductService, Product } from '../../../services/product.service';
import { RecipeService, Recipe } from '../../../services/recipe.service';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss']
})
export class SearchPage implements OnInit {
  searchQuery: string = '';
  segment: 'todos' | 'tuyos' | 'recetas' = 'todos';

  products: Product[] = [];
  recipes: Recipe[] = [];
  filteredItems: Array<Product | Recipe> = [];

  constructor(
    private productService: ProductService,
    private recipeService: RecipeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  hasKey(obj: any, key: string): boolean {
    return obj && obj.hasOwnProperty(key);
  }
  ngOnInit() {
    this.loadData();
  }

  ionViewWillEnter() {
    this.loadData();
  }

  private loadData() {
    // Carga global y propios
    this.productService.getAll().subscribe(list => {
      this.products = list;
      this.applyFilter();
    });
    this.recipeService.getAll().subscribe(list => {
      this.recipes = list;
      this.applyFilter();
    });
  }

  onSearchChange() {
    this.applyFilter();
  }

  onSegmentChange(event: any) {
    this.segment = event.detail.value;
    this.applyFilter();
  }

  private applyFilter() {
    const query = this.searchQuery.trim().toLowerCase();
    if (this.segment === 'recetas') {
      this.filteredItems = this.recipes.filter(r =>
        r.nombre.toLowerCase().includes(query)
      );
    } else {
      this.filteredItems = this.products.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        (p.marca && p.marca.toLowerCase().includes(query))
      ).filter(p =>
        this.segment === 'todos' || p.userId === this.productService.currentUserId
      );
    }
  }

  onScanBarcode() {
    // Navegar a componente de scanner (implementa lector de códigos)
    this.router.navigate(['/scan'], { queryParams: this.route.snapshot.queryParams });
  }

  onSelect(item: Product | Recipe) {
    // Regresar con selección (se maneja en la ruta padre)
    const params = this.route.snapshot.queryParams;
    this.router.navigate(['/inicio'], { queryParams: { ...params, selectId: item._id } });
  }
}
