// src/app/services/open-food-facts.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name: string;
    brands: string;
    nutriments: {
      energy_100g?: number;
      'energy-kcal_100g'?: number;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
      sugars_100g?: number;
      'saturated-fat_100g'?: number;
      fiber_100g?: number;
      salt_100g?: number;
      sodium_100g?: number;
    };
    serving_size?: string;
    serving_quantity?: number;
    image_url?: string;
    image_small_url?: string;
    image_thumb_url?: string;
  };
  status: number;
  status_verbose: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenFoodFactsService {
  private readonly API_URL = 'https://world.openfoodfacts.org/api/v0/product';
  
  constructor(private http: HttpClient) {}
  
  /**
   * Busca un producto por código de barras en Open Food Facts
   * @param barcode Código de barras del producto
   * @returns Observable con los datos del producto o null si no se encuentra
   */
  searchByBarcode(barcode: string): Observable<OpenFoodFactsProduct | null> {
    const url = `${this.API_URL}/${barcode}.json`;
    
    return this.http.get<OpenFoodFactsProduct>(url).pipe(
      map(response => {
        // Si el producto existe y el status es 1
        if (response && response.status === 1 && response.product) {
          return response;
        }
        return null;
      }),
      catchError((error) => {
        console.error('Error al buscar en Open Food Facts:', error);
        return of(null);
      })
    );
  }
  
  /**
   * Busca productos por texto en Open Food Facts
   * @param searchText Texto de búsqueda
   * @param page Página de resultados (por defecto 1)
   * @param pageSize Número de resultados por página
   * @returns Observable con la lista de productos encontrados
   */
  searchByText(searchText: string, page: number = 1, pageSize: number = 10): Observable<any[]> {
    const url = 'https://world.openfoodfacts.org/cgi/search.pl';
    const params = {
      search_terms: searchText,
      search_simple: '1',
      action: 'process',
      json: '1',
      page: page.toString(),
      page_size: pageSize.toString()
    };
    
    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        if (response && response.products) {
          return response.products.map((product: any) => this.convertSearchResultToLocalFormat(product));
        }
        return [];
      }),
      catchError((error) => {
        console.error('Error al buscar en Open Food Facts:', error);
        return of([]);
      })
    );
  }
  
  /**
   * Convierte un resultado de búsqueda al formato local
   * @param product Producto del resultado de búsqueda
   * @returns Producto en formato local con indicador de fuente
   */
  private convertSearchResultToLocalFormat(product: any): any {
    const nutriments = product.nutriments || {};
    
    // Verificar si tenemos calorías en kcal o en kJ
    let calorias = nutriments['energy-kcal_100g'] || 0;
    
    // Si no hay kcal pero hay kJ, convertir
    if (!calorias && nutriments.energy_100g) {
      // Convertir de kJ a kcal (1 kcal = 4.184 kJ)
      calorias = nutriments.energy_100g / 4.184;
    }
    
    return {
      _id: `off_${product.code}`, // Prefijo para distinguir de productos locales
      nombre: product.product_name || 'Producto sin nombre',
      marca: product.brands || '',
      codigoBarras: product.code,
      calorias: Math.round(calorias),
      proteinas: Math.round(nutriments.proteins_100g || 0),
      carbohidratos: Math.round(nutriments.carbohydrates_100g || 0),
      grasas: Math.round(nutriments.fat_100g || 0),
      azucares: nutriments.sugars_100g ? Math.round(nutriments.sugars_100g) : undefined,
      grasasSaturadas: nutriments['saturated-fat_100g'] ? Math.round(nutriments['saturated-fat_100g']) : undefined,
      fibra: nutriments.fiber_100g ? Math.round(nutriments.fiber_100g) : undefined,
      sal: nutriments.salt_100g ? Math.round(nutriments.salt_100g) : undefined,
      porcion: product.serving_quantity || undefined,
      imagenUrl: product.image_url || product.image_small_url || product.image_thumb_url,
      isFromOpenFoodFacts: true // Indicador de que viene de Open Food Facts
    };
  }
  
  /**
   * Convierte un producto de Open Food Facts al formato de tu base de datos
   * @param openFoodProduct Producto de Open Food Facts
   * @returns Producto en el formato de tu aplicación
   */
  convertToLocalProduct(openFoodProduct: OpenFoodFactsProduct): Partial<any> {
    const product = openFoodProduct.product;
    const nutriments = product.nutriments;
    
    // Verificar si tenemos calorías en kcal o en kJ
    let calorias = nutriments['energy-kcal_100g'] || 0;
    
    // Si no hay kcal pero hay kJ, convertir
    if (!calorias && nutriments.energy_100g) {
      // Convertir de kJ a kcal (1 kcal = 4.184 kJ)
      calorias = nutriments.energy_100g / 4.184;
    }
    
    return {
      nombre: product.product_name || 'Producto sin nombre',
      marca: product.brands || '',
      codigoBarras: openFoodProduct.code,
      calorias: Math.round(calorias),
      proteinas: Math.round(nutriments.proteins_100g || 0),
      carbohidratos: Math.round(nutriments.carbohydrates_100g || 0),
      grasas: Math.round(nutriments.fat_100g || 0),
      azucares: nutriments.sugars_100g ? Math.round(nutriments.sugars_100g) : undefined,
      grasasSaturadas: nutriments['saturated-fat_100g'] ? Math.round(nutriments['saturated-fat_100g']) : undefined,
      fibra: nutriments.fiber_100g ? Math.round(nutriments.fiber_100g) : undefined,
      sal: nutriments.salt_100g ? Math.round(nutriments.salt_100g) : undefined,
      // Si hay información de porción, convertirla a gramos
      porcion: product.serving_quantity || undefined,
      // Añadir información adicional que podría ser útil
      imagenUrl: product.image_url || product.image_small_url || product.image_thumb_url
    };
  }
  
  /**
   * Busca un producto y lo convierte al formato local si se encuentra
   * @param barcode Código de barras
   * @returns Observable con el producto convertido o null
   */
  searchAndConvert(barcode: string): Observable<any | null> {
    return this.searchByBarcode(barcode).pipe(
      map(product => {
        if (product) {
          return this.convertToLocalProduct(product);
        }
        return null;
      })
    );
  }
}