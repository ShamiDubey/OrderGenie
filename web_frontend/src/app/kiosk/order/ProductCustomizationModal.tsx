"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { X, Minus, Plus } from "lucide-react";
import { Product, CategoryModifier, SelectedModifier } from "@/types";
import { CartItem } from "@/context/KioskContext";

interface ProductCustomizationModalProps {
  product: Product;
  categoryModifiers: CategoryModifier[];
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, "quantity" | "cartItemId"> & { quantity: number }) => void;
}

export default function ProductCustomizationModal({
  product,
  categoryModifiers,
  onClose,
  onAddToCart,
}: ProductCustomizationModalProps) {
  const [quantity, setQuantity] = useState(1);

  // Track selected options for each modifier group
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    categoryModifiers.forEach((mod) => {
      initial[mod.name] = new Set();
    });
    return initial;
  });

  // Calculate effective price (with discount if applicable)
  const basePrice = useMemo(() => {
    const price = parseFloat(product.price);
    const discountedPrice = product.discountedPrice ? parseFloat(product.discountedPrice) : null;
    const discountEnds = product.discountEnds ? new Date(product.discountEnds) : null;

    if (discountedPrice && (!discountEnds || discountEnds > new Date())) {
      return discountedPrice;
    }
    return price;
  }, [product]);

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    const price = parseFloat(product.price);
    const discountedPrice = product.discountedPrice ? parseFloat(product.discountedPrice) : null;
    const discountEnds = product.discountEnds ? new Date(product.discountEnds) : null;

    if (discountedPrice && (!discountEnds || discountEnds > new Date())) {
      return Math.round(((price - discountedPrice) / price) * 100);
    }
    return 0;
  }, [product]);

  // Calculate modifiers total
  const modifiersTotal = useMemo(() => {
    let total = 0;
    categoryModifiers.forEach((mod) => {
      const selected = selectedOptions[mod.name] || new Set();
      mod.options.forEach((opt) => {
        if (selected.has(opt.name)) {
          total += opt.price;
        }
      });
    });
    return total;
  }, [categoryModifiers, selectedOptions]);

  // Total price calculation
  const totalPrice = (basePrice + modifiersTotal) * quantity;

  // Toggle option selection
  const toggleOption = (groupName: string, optionName: string, multiSelect: boolean) => {
    setSelectedOptions((prev) => {
      const newSelected = { ...prev };
      const groupSet = new Set(prev[groupName] || []);

      if (multiSelect) {
        // Toggle for multi-select
        if (groupSet.has(optionName)) {
          groupSet.delete(optionName);
        } else {
          groupSet.add(optionName);
        }
      } else {
        // Single select - clear others and set this one
        groupSet.clear();
        groupSet.add(optionName);
      }

      newSelected[groupName] = groupSet;
      return newSelected;
    });
  };

  // Build selected modifiers for cart
  const buildSelectedModifiers = (): SelectedModifier[] => {
    const modifiers: SelectedModifier[] = [];

    categoryModifiers.forEach((mod) => {
      const selected = selectedOptions[mod.name] || new Set();
      if (selected.size > 0) {
        const options = mod.options
          .filter((opt) => selected.has(opt.name))
          .map((opt) => ({ name: opt.name, price: opt.price }));

        if (options.length > 0) {
          modifiers.push({
            groupName: mod.name,
            options,
          });
        }
      }
    });

    return modifiers;
  };

  // Check if all required modifiers are selected
  const allRequiredSelected = useMemo(() => {
    return categoryModifiers
      .filter((mod) => mod.required)
      .every((mod) => (selectedOptions[mod.name]?.size || 0) > 0);
  }, [categoryModifiers, selectedOptions]);

  const handleAddToCart = () => {
    const selectedModifiers = buildSelectedModifiers();
    const originalPrice = parseFloat(product.price);

    onAddToCart({
      productId: product.id,
      name: product.name,
      price: basePrice,
      originalPrice: originalPrice !== basePrice ? originalPrice : undefined,
      quantity,
      isVeg: product.isVeg,
      imageUrl: product.imageUrl,
      selectedModifiers: selectedModifiers.length > 0 ? selectedModifiers : undefined,
      modifiersTotal: modifiersTotal > 0 ? modifiersTotal : undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1A0A00] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with close button */}
        <div className="relative p-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#2A1A10] flex items-center justify-center text-[#E6D7D0] hover:bg-[#3A2A20] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Product Info */}
          <div className="flex gap-4 mb-6">
            {/* Product Image */}
            <div className="relative w-28 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-[#2A1A10]">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#E6D7D0]/30">
                  No Image
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {/* Veg/Non-veg indicator */}
                <div
                  className={`w-4 h-4 border-2 flex items-center justify-center ${
                    product.isVeg ? "border-green-500" : "border-red-500"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      product.isVeg ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                </div>
                <span className="text-xs text-[#E6D7D0]/60">
                  {product.isVeg ? "Veg" : "Non-Veg"}
                </span>
              </div>

              <h2 className="text-xl font-bold text-[#E6D7D0] mb-2">{product.name}</h2>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">
                  ₹{basePrice.toFixed(0)}
                </span>
                {discountPercent > 0 && (
                  <>
                    <span className="text-sm text-[#E6D7D0]/50 line-through">
                      ₹{parseFloat(product.price).toFixed(0)}
                    </span>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-semibold">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Modifiers */}
          {categoryModifiers.length > 0 && (
            <div className="space-y-6">
              {categoryModifiers.map((modifier) => (
                <div key={modifier.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[#E6D7D0] uppercase tracking-wider">
                      {modifier.name}
                    </h3>
                    {modifier.required && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    )}
                    {modifier.multiSelect && (
                      <span className="text-[10px] text-[#E6D7D0]/50">
                        (Select multiple)
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {modifier.options.map((option) => {
                      const isSelected = selectedOptions[modifier.name]?.has(option.name);
                      return (
                        <button
                          key={option.name}
                          type="button"
                          onClick={() => toggleOption(modifier.name, option.name, modifier.multiSelect)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? "bg-amber-500 text-[#1A0A00]"
                              : "bg-[#2A1A10] text-[#E6D7D0] hover:bg-[#3A2A20]"
                          }`}
                        >
                          {option.name}
                          {option.price > 0 && (
                            <span className={`ml-1 ${isSelected ? "text-[#1A0A00]/70" : "text-[#E6D7D0]/60"}`}>
                              +₹{option.price}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Footer with quantity and add to cart */}
        <div className="border-t border-[#2A1A10] p-4 bg-[#1A0A00]">
          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-full bg-[#2A1A10] flex items-center justify-center text-[#E6D7D0] hover:bg-[#3A2A20] transition-colors"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-3xl font-bold text-[#E6D7D0] w-12 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-full bg-[#2A1A10] flex items-center justify-center text-[#E6D7D0] hover:bg-[#3A2A20] transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={!allRequiredSelected}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              allRequiredSelected
                ? "bg-amber-500 text-[#1A0A00] hover:bg-amber-400"
                : "bg-[#2A1A10] text-[#E6D7D0]/50 cursor-not-allowed"
            }`}
          >
            Add to Cart - ₹{totalPrice.toFixed(0)}
          </button>
        </div>
      </div>
    </div>
  );
}
