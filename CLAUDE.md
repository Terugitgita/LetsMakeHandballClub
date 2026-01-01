①"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\会話履歴.md"
②"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\会話履歴分割ルール.txt"

③"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\docs\Format 仕様変更・修正依頼_質疑応答28_進捗表.md"
④"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\docs\Format 仕様変更・修正依頼質疑応答23.md"
⑤"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\docs\仕様変更・修正依頼質疑応答xx進捗表.md"
⑥"F:\LetsMakeHandballClub_2\LetsMakeHandballClub\docs\仕様変更・修正依頼質疑応答yy.md"

①に私との対話を私の発言が完了する度に自動で記録する事。その際、ユーザーからの発言は全て記録。Claudeの返答は全ての詳細を記録するのではなく、後で会話を再現できる様に、自然言語のみ記録する事。②に従って、①を自動分割して。

それでは時系列に従って全ての会話履歴を読んでください。

私から質問された場合、すぐにコーディングやドキュメント作成に入らず、質疑応答を繰り返し、私が「質疑応答完了。作業開始。」と宣言してから初めてコーディングやドキュメント作成を始める事。

質疑応答は⑥に直接読み書きする事。ファイル名のxxは常に最新(数字としては最大)のものを使用する事。⑥のひな型は④。

質疑応答が完了したら、実装に入る前に⑤を作成し、その進捗表に従って作業を進める事。また、一項目完了するごとに⑤を更新する事。ファイル名のyyは常に最新(数字としては最大)のものを使用する事。⑤のひな型は③。

実装したコードは常にCLIでテストし、問題があれば自動で修正する事。CLIで試せないことのみ、ユーザーにGUIで試験させること。
