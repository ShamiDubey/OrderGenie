import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ai_dashboard_frontend/models/product.dart';
import 'package:ai_dashboard_frontend/services/product_service.dart';
import 'package:ai_dashboard_frontend/services/admin_service.dart';

class ProductsTab extends StatefulWidget {
  const ProductsTab({super.key});

  @override
  State<ProductsTab> createState() => _ProductsTabState();
}

class _ProductsTabState extends State<ProductsTab> {
  List<Product> _products = [];
  List<Category> _categories = [];
  bool _isLoading = true;
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        ProductService.getProducts(limit: 200),
        ProductService.getCategories(),
      ]);
      if (mounted) {
        setState(() {
          _products = (results[0] as ProductsResponse).products;
          _categories = results[1] as List<Category>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  List<Product> get _filteredProducts {
    if (_searchQuery.isEmpty) return _products;
    return _products.where((p) =>
        p.name.toLowerCase().contains(_searchQuery.toLowerCase())).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Search and Add button
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  ),
                  onChanged: (value) => setState(() => _searchQuery = value),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: () => _showProductDialog(),
                icon: const Icon(Icons.add),
                label: const Text('Add'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.indigo,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ],
          ),
        ),
        // Products list
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator())
              : _filteredProducts.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.fastfood, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'No products found',
                            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _loadData,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        itemCount: _filteredProducts.length,
                        itemBuilder: (context, index) {
                          return _buildProductCard(_filteredProducts[index]);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildProductCard(Product product) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: product.thumbnailUrl != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(product.thumbnailUrl!, fit: BoxFit.cover),
                )
              : const Icon(Icons.fastfood, color: Colors.grey),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                border: Border.all(
                  color: product.isVeg ? Colors.green : Colors.red,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(3),
              ),
              child: Icon(
                Icons.circle,
                size: 6,
                color: product.isVeg ? Colors.green : Colors.red,
              ),
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                product.name,
                style: const TextStyle(fontWeight: FontWeight.bold),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  '\u20B9${product.effectivePrice}',
                  style: const TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (product.hasActiveDiscount) ...[
                  const SizedBox(width: 6),
                  Text(
                    '\u20B9${product.price}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: product.isAvailable
                        ? Colors.green.withValues(alpha: 0.1)
                        : Colors.red.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    product.isAvailable ? 'Available' : 'Unavailable',
                    style: TextStyle(
                      fontSize: 10,
                      color: product.isAvailable ? Colors.green : Colors.red,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (product.isFeatured) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'Featured',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.amber,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
        trailing: PopupMenuButton<String>(
          onSelected: (value) => _handleProductAction(value, product),
          itemBuilder: (context) => [
            const PopupMenuItem(value: 'edit', child: Text('Edit')),
            PopupMenuItem(
              value: 'toggle',
              child: Text(product.isAvailable ? 'Mark Unavailable' : 'Mark Available'),
            ),
            const PopupMenuItem(
              value: 'delete',
              child: Text('Delete', style: TextStyle(color: Colors.red)),
            ),
          ],
        ),
      ),
    );
  }

  void _handleProductAction(String action, Product product) async {
    switch (action) {
      case 'edit':
        _showProductDialog(product: product);
        break;
      case 'toggle':
        try {
          await AdminService.toggleProductAvailability(product.id, !product.isAvailable);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('${product.name} is now ${!product.isAvailable ? 'available' : 'unavailable'}'),
              backgroundColor: Colors.green,
            ),
          );
          _loadData();
        } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
          );
        }
        break;
      case 'delete':
        _showDeleteConfirmDialog(product);
        break;
    }
  }

  void _showDeleteConfirmDialog(Product product) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Product'),
        content: Text('Are you sure you want to delete "${product.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(context);
              try {
                await AdminService.deleteProduct(product.id);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Product deleted'), backgroundColor: Colors.green),
                );
                _loadData();
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showProductDialog({Product? product}) {
    final isEditing = product != null;
    final nameController = TextEditingController(text: product?.name ?? '');
    final priceController = TextEditingController(text: product?.price.toString() ?? '');
    final descController = TextEditingController(text: product?.description ?? '');
    final discountPriceController = TextEditingController(
      text: product?.discountedPrice?.toString() ?? '',
    );
    final prepTimeController = TextEditingController(
      text: product?.preparationTime?.toString() ?? '',
    );
    final caloriesController = TextEditingController(
      text: product?.calories?.toString() ?? '',
    );
    final servingSizeController = TextEditingController(text: product?.servingSize ?? '');
    final tagsController = TextEditingController(text: product?.tags.join(',') ?? '');

    bool isVeg = product?.isVeg ?? true;
    bool isFeatured = product?.isFeatured ?? false;
    String? selectedCategoryId = product?.categoryId;
    File? selectedImage;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text(isEditing ? 'Edit Product' : 'Add Product'),
          content: SizedBox(
            width: MediaQuery.of(context).size.width * 0.8,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Name *'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: priceController,
                    decoration: const InputDecoration(labelText: 'Price *'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descController,
                    decoration: const InputDecoration(labelText: 'Description'),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: _categories
                        .map((c) => DropdownMenuItem(value: c.id, child: Text(c.name)))
                        .toList(),
                    onChanged: (value) => setDialogState(() => selectedCategoryId = value),
                    initialValue: selectedCategoryId,
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: discountPriceController,
                    decoration: const InputDecoration(labelText: 'Discounted Price'),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: prepTimeController,
                          decoration: const InputDecoration(labelText: 'Prep Time (min)'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: caloriesController,
                          decoration: const InputDecoration(labelText: 'Calories'),
                          keyboardType: TextInputType.number,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: servingSizeController,
                    decoration: const InputDecoration(labelText: 'Serving Size'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: tagsController,
                    decoration: const InputDecoration(
                      labelText: 'Tags',
                      hintText: 'comma separated',
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: SwitchListTile(
                          title: const Text('Veg'),
                          value: isVeg,
                          onChanged: (v) => setDialogState(() => isVeg = v),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                      Expanded(
                        child: SwitchListTile(
                          title: const Text('Featured'),
                          value: isFeatured,
                          onChanged: (v) => setDialogState(() => isFeatured = v),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: () async {
                      final picker = ImagePicker();
                      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
                      if (pickedFile != null) {
                        setDialogState(() => selectedImage = File(pickedFile.path));
                      }
                    },
                    icon: const Icon(Icons.image),
                    label: Text(selectedImage != null ? 'Image Selected' : 'Select Image'),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.isEmpty || priceController.text.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Name and Price are required')),
                  );
                  return;
                }

                Navigator.pop(context);

                try {
                  if (isEditing) {
                    await AdminService.updateProduct(
                      productId: product.id,
                      name: nameController.text,
                      price: double.parse(priceController.text),
                      description: descController.text.isNotEmpty ? descController.text : null,
                      isVeg: isVeg,
                      tags: tagsController.text.isNotEmpty ? tagsController.text : null,
                      categoryId: selectedCategoryId,
                      discountedPrice: discountPriceController.text.isNotEmpty
                          ? double.parse(discountPriceController.text)
                          : null,
                      preparationTime: prepTimeController.text.isNotEmpty
                          ? int.parse(prepTimeController.text)
                          : null,
                      calories: caloriesController.text.isNotEmpty
                          ? int.parse(caloriesController.text)
                          : null,
                      servingSize: servingSizeController.text.isNotEmpty
                          ? servingSizeController.text
                          : null,
                      isFeatured: isFeatured,
                      image: selectedImage,
                    );
                  } else {
                    await AdminService.createProduct(
                      name: nameController.text,
                      price: double.parse(priceController.text),
                      description: descController.text.isNotEmpty ? descController.text : null,
                      isVeg: isVeg,
                      tags: tagsController.text.isNotEmpty ? tagsController.text : null,
                      categoryId: selectedCategoryId,
                      discountedPrice: discountPriceController.text.isNotEmpty
                          ? double.parse(discountPriceController.text)
                          : null,
                      preparationTime: prepTimeController.text.isNotEmpty
                          ? int.parse(prepTimeController.text)
                          : null,
                      calories: caloriesController.text.isNotEmpty
                          ? int.parse(caloriesController.text)
                          : null,
                      servingSize: servingSizeController.text.isNotEmpty
                          ? servingSizeController.text
                          : null,
                      isFeatured: isFeatured,
                      image: selectedImage,
                    );
                  }

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(isEditing ? 'Product updated' : 'Product created'),
                      backgroundColor: Colors.green,
                    ),
                  );
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
                  );
                }
              },
              style: ElevatedButton.styleFrom(backgroundColor: Colors.indigo),
              child: Text(isEditing ? 'Update' : 'Create', style: const TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
