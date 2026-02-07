import { NextRequest, NextResponse } from 'next/server';

// Hardcoded Gemini API key for gemini-2.5-flash-lite model
const GEMINI_API_KEY = 'AIzaSyBP8WHdlnBsz2BYSwUVKe8L1lQ0uCVkL08';
const GEMINI_MODEL = 'gemini-2.5-flash-lite';

export async function POST(request: NextRequest) {
  try {
    const { foodItems } = await request.json();

    // Validate that foodItems is provided and is an array
    if (!foodItems || !Array.isArray(foodItems) || foodItems.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one food item' },
        { status: 400 }
      );
    }

    // Validate that all items are strings (basic validation)
    const validItems = foodItems.filter(item => typeof item === 'string' && item.trim().length > 0);
    
    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'Please provide at least one valid food item' },
        { status: 400 }
      );
    }

    // Additional validation: Check if items look like prompts/questions (not food items)
    // If any item looks like a question or non-food prompt, reject it
    const questionPatterns = /\b(what|how|why|when|where|who|tell|explain|describe|give|show|help|can you|do you|will you|would you)\b/i;
    const suspiciousItems = validItems.filter(item => questionPatterns.test(item) || item.length > 100);
    
    if (suspiciousItems.length > 0) {
      return NextResponse.json({
        success: false,
        recipe: 'Please only ask for recipe suggestion',
      });
    }

    // Format food items list
    const itemsList = validItems.join(', ');

    // Create strict prompt for Gemini - only recipe suggestions allowed
    const prompt = `You are a cooking assistant that ONLY provides recipe suggestions. 

IMPORTANT: You must ONLY respond with recipe suggestions. If the user asks for anything else (general questions, other topics, etc.), you must respond with: "Please only ask for recipe suggestion".

The user has the following food items in their fridge: ${itemsList}.

Please suggest a delicious and practical recipe that uses these ingredients. Include:
1. Recipe name
2. Brief description (1-2 sentences)
3. Ingredients list (use the provided items and suggest any common pantry staples needed)
4. Step-by-step cooking instructions
5. Estimated cooking time
6. Serving size

Format your response in a clear, easy-to-read way. Be creative and practical!`;

    // Call Google Gemini API with gemini-2.5-flash-lite model
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        systemInstruction: {
          parts: [{
            text: 'You are a cooking assistant that ONLY provides recipe suggestions based on food items provided. If asked about anything other than recipes, you must respond with: "Please only ask for recipe suggestion".'
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate recipe suggestion' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Extract the generated text
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                      'Unable to generate recipe. Please try again.';

    // Additional validation: Check if response contains the restriction message
    // If user tried to ask something else, return the restriction message
    if (fullText.toLowerCase().includes('please only ask for recipe suggestion')) {
      return NextResponse.json({
        success: false,
        recipe: 'Please only ask for recipe suggestion',
      });
    }

    return NextResponse.json({
      success: true,
      recipe: fullText,
    });

  } catch (error) {
    console.error('Recipe API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

