import { serve } from 'std/http/server';
import { createClient } from '@supabase/supabase-js';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

interface RequestBody {
  tollFreeId: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    console.log('Initializing with URL:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get toll-free ID from request body
    let body;
    try {
      body = await req.json() as RequestBody;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { tollFreeId } = body;
    console.log('Processing toll-free ID:', tollFreeId);

    // First, get just the toll-free record
    console.log('Fetching toll-free record...');
    const { data: tollFreeData, error: tollFreeError } = await supabase
      .from('toll_free')
      .select(`
        *,
        provider:provider_id (
          provider_name
        ),
        status:status_id (
          status
        )
      `)
      .eq('id', tollFreeId)
      .single();

    if (tollFreeError) {
      console.error('Error fetching toll-free record:', tollFreeError);
      return new Response(JSON.stringify({ error: tollFreeError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!tollFreeData) {
      console.error('Toll-free record not found');
      return new Response(JSON.stringify({ error: 'Toll-free record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Toll-free record:', tollFreeData);

    // Then, get the sender record
    console.log('Fetching sender record...');
    const { data: senderData, error: senderError } = await supabase
      .from('sender')
      .select('*')
      .eq('id', tollFreeData.sender_id)
      .single();

    if (senderError) {
      console.error('Error fetching sender:', senderError);
      return new Response(JSON.stringify({ error: senderError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!senderData) {
      console.error('Sender record not found');
      return new Response(JSON.stringify({ error: 'Sender record not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Sender record:', senderData);

    // Finally, get the samples
    console.log('Fetching samples...');
    const { data: samples, error: samplesError } = await supabase
      .from('toll_free_samples')
      .select('*')
      .eq('id', tollFreeId)
      .single();

    if (samplesError) {
      console.error('Error fetching samples:', samplesError);
      return new Response(JSON.stringify({ error: samplesError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!samples) {
      console.error('Samples not found');
      return new Response(JSON.stringify({ error: 'Samples not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Samples:', samples);

    // Get the brief template
    console.log('Fetching template...');
    const { data: templateData, error: templateError } = await supabase
      .from('brief_templates')
      .select('*')
      .eq('provider_id', tollFreeData.provider_id)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
      return new Response(JSON.stringify({ error: templateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!templateData) {
      console.error('Template not found');
      return new Response(JSON.stringify({ error: 'Template not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Template data:', templateData);

    // Download the template file
    console.log('Downloading template file...');
    const { data: templateFile, error: downloadError } = await supabase.storage
      .from('brief-templates')
      .download(templateData.template_file_path);

    if (downloadError) {
      console.error('Error downloading template:', downloadError);
      return new Response(JSON.stringify({ error: downloadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!templateFile) {
      console.error('Template file not found');
      return new Response(JSON.stringify({ error: 'Template file not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Template file downloaded successfully');

    // Prepare template data
    const docData = {
      business_name: senderData?.business_name || '',
      address: senderData?.address || '',
      city: senderData?.city || '',
      state: senderData?.state || '',
      zip: senderData?.zip || '',
      phone: senderData?.phone || '',
      sender: senderData?.sender || '',
      shorturl: senderData?.shorturl || '',
      use_case: tollFreeData?.use_case || '',
      Welcome_Msg: samples?.welcome_msg || '',
      sample1: samples?.sample_copy1 || '',
      sample2: samples?.sample_copy2 || '',
      sample3: samples?.sample_copy3 || '',
      Help_Msg: samples?.help_msg || '',
      Unsubscribe_Msg: samples?.unsubscribe_msg || '',
      cta: senderData?.cta || 'N/A',
      provider: tollFreeData.provider?.provider_name || '',
      status: tollFreeData.status?.status || '',
      campaign_id: tollFreeData.campaignid_tcr || '',
      submitted_date: tollFreeData.submitteddate ? new Date(tollFreeData.submitteddate).toLocaleDateString() : '',
      notes: tollFreeData.notes || '',
      date: new Date().toLocaleDateString()
    };

    console.log('Document data prepared:', docData);

    try {
      // Generate the document
      console.log('Creating PizZip instance...');
      const arrayBuffer = await templateFile.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      console.log('Creating Docxtemplater instance...');
      const doc = new Docxtemplater();
      doc.loadZip(zip);

      console.log('Setting document options...');
      doc.setOptions({
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '{{',
          end: '}}'
        }
      });

      console.log('Setting document data...');
      doc.setData(docData);

      console.log('Rendering document...');
      doc.render();

      console.log('Generating output...');
      const output = doc.getZip().generate({
        type: 'uint8array',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        compression: 'DEFLATE'
      });

      // Generate filename
      const filename = `brief-${tollFreeId}-${Date.now()}.docx`;

      // Return the file for download
      return new Response(output, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': output.length.toString()
        }
      });
    } catch (docError) {
      console.error('Error generating document:', docError);
      console.error('Error stack:', docError instanceof Error ? docError.stack : undefined);
      return new Response(JSON.stringify({ 
        error: docError instanceof Error ? docError.message : 'Error generating document',
        stack: docError instanceof Error ? docError.stack : undefined,
        properties: docError.properties
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  } catch (error: unknown) {
    console.error('Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}); 