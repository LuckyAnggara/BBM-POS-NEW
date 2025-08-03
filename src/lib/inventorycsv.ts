import { format } from 'date-fns'
import { toast } from 'sonner'
import type { Product, Category, ProductInput, Branch } from '@/lib/types'
import { createProduct } from '@/lib/laravel/product'

// --- Type Definitions ---
export interface ParsedCsvItem extends ProductInput {
  isDuplicateSku?: boolean
  categoryNameForPreview?: string
  isCategoryInvalid?: boolean
}

// --- Export Logic ---

const escapeCSVField = (field: any): string => {
  if (field === null || field === undefined) return ''
  const stringField = String(field)
  if (
    stringField.includes(',') ||
    stringField.includes('"') ||
    stringField.includes('\n')
  ) {
    return `"${stringField.replace(/"/g, '""')}"`
  }
  return stringField
}

export const exportInventoryToCSV = (
  items: Product[],
  selectedBranch: Branch | null
) => {
  if (!items || items.length === 0) {
    toast.info('Tidak Ada Data', {
      description: 'Tidak ada data inventaris untuk diekspor.',
    })
    return
  }

  const headers = [
    'id',
    'name',
    'sku',
    'category_id',
    'category_name',
    'quantity',
    'price',
    'cost_price',
    'image_url',
    'image_hint',
  ]
  const csvRows = [headers.join(',')]

  items.forEach((item) => {
    const row = headers.map((header) => escapeCSVField((item as any)[header]))
    csvRows.push(row.join(','))
  })

  const csvString = csvRows.join('\n')
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  const branchNamePart =
    selectedBranch?.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'cabang'
  const datePart = format(new Date(), 'yyyyMMdd')
  link.setAttribute('download', `inventaris_${branchNamePart}_${datePart}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success('Ekspor Berhasil', {
    description: 'Data inventaris telah diekspor ke CSV.',
  })
}

// --- Template Download Logic ---

export const downloadInventoryTemplateCSV = (
  categories: Category[],
  selectedBranch: Branch | null
) => {
  if (!selectedBranch) {
    toast.error('Pilih Cabang', {
      description: 'Pilih cabang untuk mengunduh template yang relevan.',
    })
    return
  }
  const headers = [
    'name',
    'sku',
    'category_id',
    'quantity',
    'price',
    'cost_price',
    'image_url',
    'image_hint',
  ]
  let csvString = ''

  csvString +=
    '# INSTRUKSI PENGISIAN DATA INVENTARIS (Hapus baris ini dan di bawahnya sebelum impor):\n'
  csvString += "# 1. 'name': Nama Produk (Wajib diisi).\n"
  csvString +=
    "# 2. 'sku': Stock Keeping Unit (Opsional, akan dibuat otomatis jika kosong).\n"
  csvString +=
    "# 3. 'category_id': ID Kategori dari daftar di bawah (Wajib diisi).\n"
  csvString += "# 4. 'quantity': Jumlah stok awal (Wajib, angka >= 0).\n"
  csvString += "# 5. 'price': Harga Jual Satuan (Wajib, angka >= 0).\n"
  csvString +=
    "# 6. 'cost_price': Harga Pokok Satuan (Opsional, angka >= 0, default 0).\n"
  csvString +=
    "# 7. 'image_url': URL Gambar Produk (Opsional, harus URL valid).\n"
  csvString +=
    "# 8. 'image_hint': Petunjuk untuk placeholder gambar (Opsional, 1-2 kata, contoh: 'biji kopi').\n"
  csvString +=
    '#--------------------------------------------------------------------------------------\n'
  csvString +=
    "# DAFTAR ID KATEGORI YANG TERSEDIA UNTUK CABANG INI (Gunakan 'categoryId' dari sini):\n"
  if (categories.length > 0) {
    categories.forEach((cat) => {
      csvString += `# category_id: ${cat.id}, Nama Kategori: ${cat.name}\n`
    })
  } else {
    csvString +=
      "# Belum ada kategori. Silakan buat kategori terlebih dahulu melalui menu 'Kelola Kategori'.\n"
  }
  csvString +=
    '#--------------------------------------------------------------------------------------\n'
  csvString += headers.join(',') + '\n'
  csvString +=
    'Contoh Produk,SKU-CONTOH,ID_KATEGORI_DARI_DAFTAR_DI_ATAS,10,15000,10000,https://placehold.co/64x64.png,contoh produk\n'

  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  const branchNamePart = selectedBranch.name
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
  link.setAttribute('download', `template_inventaris_${branchNamePart}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toast.success('Template Diunduh', {
    description: 'Template CSV berhasil diunduh.',
  })
}

// --- Import Logic ---

export const parseInventoryCSV = (
  csvContent: string,
  existingItems: Product[],
  allCategories: Category[],
  selectedBranchId: string
): { data: ParsedCsvItem[]; invalidCategoryCount: number; error?: string } => {
  const lines = csvContent
    .split(/\r\n|\n/)
    .filter((line) => !line.trim().startsWith('#') && line.trim() !== '')

  if (lines.length < 2) {
    return {
      data: [],
      invalidCategoryCount: 0,
      error:
        'File CSV Kosong atau Invalid: File tidak berisi data atau header (setelah menghapus komentar).',
    }
  }

  const headersLine = lines[0].toLowerCase()
  const headers = headersLine.split(',').map((h) => h.trim())
  const requiredHeaders = ['name', 'category_id', 'quantity', 'price']
  const missingHeaders = requiredHeaders.filter((rh) => !headers.includes(rh))

  if (missingHeaders.length > 0) {
    return {
      data: [],
      invalidCategoryCount: 0,
      error: `Header CSV Tidak Lengkap: Kolom berikut wajib ada: ${missingHeaders.join(
        ', '
      )}. Perhatikan penulisan (case-insensitive).`,
    }
  }

  const nameIndex = headers.indexOf('name')
  const categoryIdIndex = headers.indexOf('category_id')
  const quantityIndex = headers.indexOf('quantity')
  const priceIndex = headers.indexOf('price')
  const skuIndex = headers.indexOf('sku')
  const costPriceIndex = headers.indexOf('cost_price')
  const imageUrlIndex = headers.indexOf('image_url')
  const imageHintIndex = headers.indexOf('image_hint')

  const data: ParsedCsvItem[] = []
  let invalidCategoryCount = 0

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue
    const currentline = lines[i].split(',')

    const name = currentline[nameIndex]?.trim()
    const categoryId = currentline[categoryIdIndex]?.trim()
    const quantityStr = currentline[quantityIndex]?.trim()
    const priceStr = currentline[priceIndex]?.trim()

    if (!name || !categoryId || !quantityStr || !priceStr) {
      console.warn(`Skipping line ${i + 1} due to missing required fields.`)
      continue
    }

    const quantity = parseFloat(quantityStr)
    const price = parseFloat(priceStr)

    if (isNaN(quantity) || isNaN(price) || quantity < 0 || price < 0) {
      console.warn(
        `Skipping line ${
          i + 1
        } due to invalid numeric values for quantity/price.`
      )
      continue
    }

    const sku = skuIndex > -1 ? currentline[skuIndex]?.trim() : ''
    const isDuplicateSku =
      !!sku &&
      sku.trim() !== '' &&
      existingItems.some((existingItem) => existingItem.sku === sku)

    const category = allCategories.find((cat) => cat.id === Number(categoryId))
    const isCategoryInvalid = !category
    const categoryNameForPreview = category
      ? category.name
      : `ID: ${categoryId} (Tidak Valid)`
    if (isCategoryInvalid) {
      invalidCategoryCount++
    }

    data.push({
      branch_id: selectedBranchId,
      name,
      sku,
      category_id: Number(categoryId),
      category_name: categoryNameForPreview,
      quantity,
      price,
      cost_price:
        costPriceIndex > -1 && currentline[costPriceIndex]?.trim()
          ? parseFloat(currentline[costPriceIndex].trim())
          : 0,
      image_url:
        imageUrlIndex > -1 ? currentline[imageUrlIndex]?.trim() : undefined,
      image_hint:
        imageHintIndex > -1 ? currentline[imageHintIndex]?.trim() : undefined,
      isDuplicateSku,
      categoryNameForPreview,
      isCategoryInvalid,
    })
  }

  if (data.length === 0) {
    return {
      data: [],
      invalidCategoryCount: 0,
      error:
        'Tidak Ada Data Valid: Tidak ada data produk yang valid ditemukan di file CSV.',
    }
  }

  return { data, invalidCategoryCount }
}

export const batchImportInventory = async (
  parsedData: ParsedCsvItem[],
  allCategories: Category[]
): Promise<{
  successCount: number
  errorCount: number
  skippedInvalidCategoryCount: number
  errorMessages: string[]
}> => {
  let successCount = 0
  let errorCount = 0
  let skippedInvalidCategoryCount = 0
  const errorMessages: string[] = []

  const results = await Promise.allSettled(
    parsedData.map(async (itemData) => {
      if (itemData.isCategoryInvalid) {
        skippedInvalidCategoryCount++
        throw new Error(
          `Kategori ID '${itemData.category_id}' tidak valid untuk produk '${itemData.name}'. Item dilewati.`
        )
      }
      const selectedCategory = allCategories.find(
        (c) => c.id === itemData.category_id
      )
      if (!selectedCategory) {
        skippedInvalidCategoryCount++
        throw new Error(
          `Kategori dengan ID '${itemData.category_id}' untuk produk '${itemData.name}' tidak ditemukan. Item dilewati.`
        )
      }
      const {
        isDuplicateSku,
        categoryNameForPreview,
        isCategoryInvalid,
        ...actualItemData
      } = itemData

      return createProduct(actualItemData)
    })
  )

  results.forEach((result, index) => {
    const itemName = parsedData[index]?.name || `Item di baris ${index + 2}`
    if (
      result.status === 'fulfilled' &&
      result.value &&
      !('error' in result.value)
    ) {
      successCount++
    } else {
      errorCount++
      const errorMessage =
        result.status === 'rejected'
          ? result.reason?.message
          : (result.value as { error: string })?.error
      errorMessages.push(
        `${itemName}: ${errorMessage || 'Error tidak diketahui'}`
      )
      console.error(`Error importing ${itemName}:`, errorMessage)
    }
  })

  return {
    successCount,
    errorCount,
    skippedInvalidCategoryCount,
    errorMessages,
  }
}
