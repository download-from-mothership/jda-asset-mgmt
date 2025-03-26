import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function updateTemplate() {
  try {
    const { data, error } = await supabase
      .from('brief_templates')
      .update({
        template_file_path: 'pineapple-tfn-brief-template-v2.docx',
        template_format: {
          placeholders: [
            'did', 'sender', 'provider', 'use_case', 'campaign_id',
            'status', 'submitted_date', 'notes', 'sample1', 'sample2',
            'sample3', 'date'
          ],
          version: '2.0',
          metadata: {
            description: 'Updated Pineapple TFN Brief Template with correct placeholders',
            last_modified: new Date().toISOString()
          }
        }
      })
      .eq('id', 8)
      .select()

    if (error) {
      console.error('Error updating template:', error)
      return
    }

    console.log('Template updated successfully:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

async function addSignalWireTemplate() {
  try {
    const { data, error } = await supabase
      .from('brief_templates')
      .insert({
        template_name: 'SIGNALWIRE-TFN-BRIEF-TEMPLATE',
        provider_id: 3,
        did_type: 1,
        template_file_path: 'signalwire-tfn-brief-template.docx',
        template_text: '',
        template_format: {
          placeholders: [
            'did', 'sender', 'provider', 'use_case', 'campaign_id',
            'status', 'submitted_date', 'notes', 'sample1', 'sample2',
            'sample3', 'date'
          ],
          version: '1.0',
          metadata: {
            description: 'SignalWire TFN Brief Template',
            created_by: 'system',
            last_modified: new Date().toISOString()
          }
        }
      })
      .select()

    if (error) {
      console.error('Error adding template:', error)
      return
    }

    console.log('Template added successfully:', data)
  } catch (error) {
    console.error('Error:', error)
  }
}

updateTemplate()
addSignalWireTemplate() 