import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const payload = await req.json();

    // Extract required fields from payload
    const {
      projeto_id: projectId,
      token_lovable: token,
      mensagem: message,
      modo_pensar: planMode,
      modelo_ia: model,
      device_id: deviceId,
      browser_session_id: browserSessionId,
      session_headers: sessionHeaders,
      upload_files: uploadFiles,
    } = payload;

    // Validate essential fields
    if (!projectId || !token || !message) {
      return new Response(
        JSON.stringify({
          success: false,
          error_display: "Missing required fields",
          message: "projeto_id, token_lovable, and mensagem are required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Prepare the message for Lovable API
    const lovablePayload: any = {
      content: message,
    };

    // Add plan mode if specified
    if (planMode !== undefined) {
      lovablePayload.mode = planMode ? "plan" : "normal";
    }

    // Add model if specified
    if (model) {
      lovablePayload.model = model;
    }

    // Add files if present
    if (uploadFiles && Array.isArray(uploadFiles) && uploadFiles.length > 0) {
      lovablePayload.files = uploadFiles.map((f: any) => ({
        name: f.file_name,
        type: f.file_type,
        data: f.file_data,
      }));
    }

    // Call Lovable API to send the message
    const lovableApiUrl = `https://api.lovable.dev/projects/${projectId}/messages`;

    const lovableHeaders: any = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    };

    // Add session headers if provided
    if (sessionHeaders && typeof sessionHeaders === "object") {
      Object.assign(lovableHeaders, sessionHeaders);
    }

    const lovableResponse = await fetch(lovableApiUrl, {
      method: "POST",
      headers: lovableHeaders,
      body: JSON.stringify(lovablePayload),
    });

    const lovableData = await lovableResponse.json();

    if (!lovableResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error_display: lovableData.error || "Failed to send message to Lovable",
          message: lovableData.message || lovableResponse.statusText,
        }),
        {
          status: lovableResponse.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ai_message_id_usado: lovableData.id || lovableData.message_id || "",
          message: "Prompt sent successfully",
        },
        message: "Message sent to Lovable",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("[proxy-command] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error_display: "Internal server error",
        message: error.message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
