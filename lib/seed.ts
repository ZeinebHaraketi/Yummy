import { ID } from "react-native-appwrite";
import { appwriteConfig, databases, storage } from "./appwrite";
import dummyData from "./data";

interface Category {
    name: string;
    description: string;
}

interface Customization {
    name: string;
    price: number;
    type: "topping" | "side" | "size" | "crust" | string;
}

interface MenuItem {
    name: string;
    description: string;
    image_url: string;
    price: number;
    rating: number;
    calories: number;
    protein: number;
    category_name: string;
    customizations: string[];
}

interface DummyData {
    categories: Category[];
    customizations: Customization[];
    menu: MenuItem[];
}

const data = dummyData as DummyData;

async function clearAll(collectionId: string): Promise<void> {
    const list = await databases.listDocuments(
        appwriteConfig.databaseId,
        collectionId
    );

    await Promise.all(
        list.documents.map((doc) =>
            databases.deleteDocument(appwriteConfig.databaseId, collectionId, doc.$id)
        )
    );
}

async function clearStorage(): Promise<void> {
    const list = await storage.listFiles(appwriteConfig.bucketId);

    await Promise.all(
        list.files.map((file) =>
            storage.deleteFile(appwriteConfig.bucketId, file.$id)
        )
    );
}

async function uploadImageToStorage(imageUrl: string): Promise<string> {
    // Default placeholder configuration
    const width = 300;
    const height = 200;
    const text = encodeURIComponent(imageUrl.split('/').pop()?.split('.')[0] || 'food');
    const placeholderUrl = `https://via.placeholder.com/${width}x${height}.png?text=${text}`;

    try {
        console.log(`🖼️ Using placeholder image: ${placeholderUrl}`);

        // Create a complete file object with all required properties
        const file = {
            uri: placeholderUrl,
            name: `food-${Date.now()}.png`,
            type: 'image/png',
            size: 10240, // Estimated size for placeholder (10KB)
        };

        console.log('⬆️ Attempting to upload placeholder...');
        const uploadedFile = await storage.createFile(
            appwriteConfig.bucketId,
            ID.unique(),
            file
        );

        console.log('✅ Placeholder uploaded successfully');
        const fileUrl = storage.getFileViewURL(appwriteConfig.bucketId, uploadedFile.$id);
        return typeof fileUrl === 'string' ? fileUrl : fileUrl.toString();

    } catch (error) {
        console.error('❌ Placeholder upload failed:', error);
        // Return the direct placeholder URL as fallback
        return placeholderUrl;
    }
}
async function seed(): Promise<void> {
    try {
        console.log("🚀 Starting seed process...");

        // Clear existing data
        console.log("🧹 Clearing old data...");
        await clearAll(appwriteConfig.categoriesCollectionId);
        await clearAll(appwriteConfig.customizationsCollectionId);
        await clearAll(appwriteConfig.menuCollectionId);
        await clearAll(appwriteConfig.menuCustomizationsCollectionId);
        await clearStorage();
        console.log("✅ Data cleared successfully");

        // Seed categories
        console.log("📦 Seeding categories...");
        const categoryMap: Record<string, string> = {};
        for (const cat of data.categories) {
            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.categoriesCollectionId,
                ID.unique(),
                cat
            );
            categoryMap[cat.name] = doc.$id;
            console.log(`Created category: ${cat.name}`);
        }
        console.log(`✅ ${data.categories.length} categories seeded`);

        // Seed customizations
        console.log("⚙️ Seeding customizations...");
        const customizationMap: Record<string, string> = {};
        for (const cus of data.customizations) {
            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.customizationsCollectionId,
                ID.unique(),
                {
                    name: cus.name,
                    price: cus.price,
                    type: cus.type,
                }
            );
            customizationMap[cus.name] = doc.$id;
            console.log(`Created customization: ${cus.name}`);
        }
        console.log(`✅ ${data.customizations.length} customizations seeded`);

        // Seed menu items
        console.log("🍕 Seeding menu items...");
        const menuMap: Record<string, string> = {};

        for (const item of data.menu) {
            try {
                console.log(`\nProcessing: ${item.name}`);

                // Verify category exists
                if (!categoryMap[item.category_name]) {
                    console.warn(`⚠️ Category not found: ${item.category_name}`);
                    continue;
                }

                // Upload image (using placeholder)
                const imageUrl = await uploadImageToStorage(item.image_url);

                // Create menu document
                const doc = await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.menuCollectionId,
                    ID.unique(),
                    {
                        name: item.name,
                        description: item.description,
                        image_url: imageUrl,
                        price: item.price,
                        rating: item.rating,
                        calories: item.calories,
                        protein: item.protein,
                        categories: categoryMap[item.category_name],
                    }
                );
                menuMap[item.name] = doc.$id;

                // Add customizations
                for (const cusName of item.customizations) {
                    if (!customizationMap[cusName]) {
                        console.warn(`⚠️ Customization not found: ${cusName}`);
                        continue;
                    }

                    await databases.createDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.menuCustomizationsCollectionId,
                        ID.unique(),
                        {
                            menu: doc.$id,
                            customizations: customizationMap[cusName],
                        }
                    );
                    console.log(`➕ Added customization: ${cusName}`);
                }

            } catch (error) {
                console.error(`❌ Failed to process ${item.name}:`, error);
                continue;
            }
        }

        console.log("✅ Seeding complete.");
    } catch (error) {
        console.error("🔥 Seeding failed:", error);
        throw error;
    }
}

export default seed;