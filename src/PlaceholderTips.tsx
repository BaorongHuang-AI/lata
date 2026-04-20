import React from 'react';

const PlaceholderTips = () => {
    return (
        <div className="max-w-full mx-auto mt-4">
            <div className="collapse collapse-arrow bg-base-200 rounded-box shadow">
                <input type="checkbox" />
                <div className="collapse-title text-lg font-medium">
                    Tips
                </div>
                <div className="collapse-content text-sm space-y-2">
                    <p>You can use the following placeholders in your prompt templates:</p>
                    <ul className="list-disc list-inside">
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${sourceLang}'}</code> – The source language of the text (e.g., <em>English</em>).
                        </li>
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${targetLang}'}</code> – The target language for translation or output.
                        </li>
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${source}'}</code> – The actual input text from the user.
                        </li>
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${target}'}</code> – The expected or generated result in the target language.
                        </li>
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${terms}'}</code> – A list of glossary terms in the format: <br />
                            <span className="ml-4 block italic">sourceTerm1: targetTerm1, sourceTerm2: targetTerm2</span>
                            <span className="ml-4 block text-gray-500">e.g., <code>apple:苹果, banana:香蕉</code></span>
                        </li>
                        <li>
                            <code className="bg-base-300 px-1 rounded">{'${reference}'}</code> – Additional context or background info to guide the AI's response.
                        </li>

                    </ul>
                    <div>
                        <p className="font-medium">Example usage:</p>
                        <pre className="bg-base-300 p-2 rounded overflow-x-auto text-sm">
              Translate from <code>{'${sourceLang}'}</code> to <code>{'${targetLang}'}</code>:<br />
              <code>{'${source}'}</code><br />
              Use the following terms: <code>{'${terms}'}</code><br />
              Refer to this background info: <code>{'${reference}'}</code>
            </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaceholderTips;
